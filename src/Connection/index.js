'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const cuid = require('cuid')
const Emittery = require('emittery')
const debug = require('debug')('adonis:websocket')
const msp = require('@adonisjs/websocket-packet')

const Context = require('../Context')
const Socket = require('../Socket')
const ChannelsManager = require('../Channel/Manager')

/**
 * Connection is an instance of a single TCP connection. This class decodes the
 * packets and use them to run operations like. `JOIN/LEAVE A TOPIC`, `EMIT EVENT`
 * and so on.
 *
 * 1. Each connection is given a unique id
 * 2. The connection will also maintain a list of subscriptions for a connection
 *
 * @class Connection
 *
 * @param {Object} ws       The underlying socket connection
 * @param {Object} req      Request object
 * @param {Object} encoder  Encoder to be used for encoding/decoding messages
 */
class Connection extends Emittery {
  constructor (ws, req, encoder) {
    super()

    this.ws = ws
    this.req = req

    /**
     * Each connection must have a unique id. The `cuid` keeps
     * it unique across the cluster
     *
     * @type {String}
     */
    this.id = cuid()

    /**
     * The encoder is used to encode and decode packets. Note this is
     * not encryption or decryption, encoders are used to translate
     * data-types into raw string.
     *
     * @type {Object}
     */
    this._encoder = encoder

    /**
     * A connection can have multiple subscriptions for a given channel.
     *
     * @type {Map}
     */
    this._subscriptions = new Map()

    /**
     * An array of subscriptions queue, we let connection join
     * topics one by one and not in parallel.
     *
     * This also helps in avoiding duplicate subscriptions
     * to the same topic.
     *
     * @type {Array}
     */
    this._subscriptionsQueue = []

    /**
     * A flag to tell whether the queue is in process or not.
     *
     * @type {Boolean}
     */
    this._processingQueue = false

    /**
     * Added as a listener to `onclose` event of the subscription.
     */
    this.deleteSubscription = function ({ topic }) {
      debug('removed subscription for %s topic', topic)
      this._subscriptions.delete(topic)
    }.bind(this)

    /**
     * The number of times ping check has been done. This
     * counter will reset, anytime client will ping
     * or send any sort of frames.
     *
     * @type {Number}
     */
    this.pingElapsed = 0

    /**
     * Event listeners
     */
    this.ws.on('message', this._onMessage.bind(this))
    this.ws.on('error', this._onError.bind(this))
    this.ws.on('close', this._onClose.bind(this))
  }

  /**
   * Returns the ready state of the underlying
   * ws connection
   *
   * @method readyState
   *
   * @return {Number}
   */
  get readyState () {
    return this.ws.readyState
  }

  /**
   * Notifies about the drop packets. This method will log
   * them to the debug output
   *
   * @method _notifyPacketDropped
   *
   * @param  {Function}           fn
   * @param  {String}             reason
   *
   * @return {void}
   *
   * @private
   */
  _notifyPacketDropped (fn, message, ...args) {
    debug(`${fn}:${message}`, ...args)
  }

  /**
   * Opens the packet by decoding it.
   *
   * @method _openPacket
   *
   * @param  {Buffer}    packet
   *
   * @return {Promise}
   *
   * @private
   */
  _openPacket (packet) {
    return new Promise((resolve) => {
      this._encoder.decode(packet, (error, payload) => {
        if (error) {
          return resolve({})
        }
        resolve(payload)
      })
    })
  }

  /**
   * Invoked everytime a new message is received. This method will
   * open the packet and handles it based upon the packet type.
   *
   * Invalid packets are dropped.
   *
   * @method _onMessage
   *
   * @param  {Object}   packet
   *
   * @return {void}
   *
   * @private
   */
  _onMessage (packet) {
    /**
     * Reset ping elapsed
     *
     * @type {Number}
     */
    this.pingElapsed = 0

    this
      ._openPacket(packet)
      .then((payload) => {
        if (!payload.t) {
          this._notifyPacketDropped('_onMessage', 'packet dropped, there is no {t} property %j', payload)
          return
        }
        this._handleMessage(payload)
      })
  }

  /**
   * Handles the message packet, this method is invoked when
   * packet is valid and must be handled.
   *
   * @method _handleMessage
   *
   * @param  {Object}       packet
   *
   * @return {void}
   *
   * @private
   */
  _handleMessage (packet) {
    /**
     * Subscription related packet
     */
    if (msp.isJoinPacket(packet) || msp.isLeavePacket(packet)) {
      this._subscriptionsQueue.push(packet)
      this._advanceQueue()
      return
    }

    /**
     * Event packet
     */
    if (msp.isEventPacket(packet)) {
      this._processEvent(packet)
      return
    }

    /**
     * Ping from client
     */
    if (msp.isPingPacket(packet)) {
      this.sendPacket(msp.pongPacket())
      return
    }

    this._notifyPacketDropped('_handleMessage', 'invalid packet %j', packet)
  }

  /**
   * Processes the event by ensuring the packet is valid and there
   * is a subscription for the given topic.
   *
   * @method _processEvent
   *
   * @param  {Object}      packet
   *
   * @return {void}
   */
  _processEvent (packet) {
    if (!msp.isValidEventPacket(packet)) {
      this._notifyPacketDropped('_processEvent', 'dropping event since packet is invalid %j', packet)
      return
    }

    if (!this.hasSubscription(packet.d.topic)) {
      this._notifyPacketDropped('_processEvent', 'dropping event since there are no subscription %j', packet)
      return
    }

    this.getSubscription(packet.d.topic).serverMessage(packet.d)
  }

  /**
   * Process the subscription packets, one at a time in
   * sequence.
   *
   * @method _getSubscriptionHandle
   *
   * @param  {Object}             packet
   *
   * @return {void}
   *
   * @private
   */
  _getSubscriptionHandle (packet) {
    return msp.isJoinPacket(packet) ? this._joinTopic(packet) : this._leaveTopic(packet)
  }

  /**
   * Advances the join queue until there are join
   * packets in the queue
   *
   * @method _advanceQueue
   *
   * @return {void}
   *
   * @private
   */
  _advanceQueue () {
    /**
     * Exit early when processing queue
     */
    if (this._processingQueue) {
      return
    }

    /**
     * Pick next packet from the queue
     */
    const nextPacket = this._subscriptionsQueue.shift()
    if (!nextPacket) {
      return
    }

    /**
     * Set processing flag to avoid parallel processing
     *
     * @type {Boolean}
     */
    this._processingQueue = true

    this
      ._getSubscriptionHandle(nextPacket)
      .then((responsePacket) => {
        this.sendPacket(responsePacket)
        this._processingQueue = false
        this._advanceQueue()
      })
      .catch((errorPacket) => {
        this.sendPacket(errorPacket)
        this._processingQueue = false
        this._advanceQueue()
      })
  }

  /**
   * Joins the topic. The consumer of this function should make sure
   * that the packet type is correct when sending to this function.
   *
   * @method _joinTopic
   *
   * @param  {Object}   packet
   *
   * @return {void}
   *
   * @private
   */
  _joinTopic (packet) {
    return new Promise((resolve, reject) => {
      /**
       * The join packet is invalid, since the topic name is missing
       */
      if (!msp.isValidJoinPacket(packet)) {
        return reject(msp.joinErrorPacket('unknown', 'Missing topic name'))
      }

      /**
       * Make sure the same connection is not subscribed to this
       * topic already.
       */
      if (this.hasSubscription(packet.d.topic)) {
        return reject(msp.joinErrorPacket(packet.d.topic, 'Cannot join the same topic twice'))
      }

      /**
       * Ensure topic channel does exists, otherwise return error
       */
      const channel = ChannelsManager.resolve(packet.d.topic)
      if (!channel) {
        return reject(msp.joinErrorPacket(packet.d.topic, 'Topic cannot be handled by any channel'))
      }

      /**
       * Grap current subscription context
       *
       * @type {Context}
       */
      const context = new Context(this.req)
      context.socket = new Socket(packet.d.topic, this)

      channel
        .joinTopic(context)
        .then(() => {
          this.addSubscription(packet.d.topic, context.socket)
          resolve(msp.joinAckPacket(packet.d.topic))
        })
        .catch((error) => {
          reject(msp.joinErrorPacket(packet.d.topic, error.message))
        })
    })
  }

  /**
   * Leaves the topic by removing subscriptions
   *
   * @method _leaveTopic
   *
   * @param  {Object}    packet
   *
   * @return {void}
   *
   * @private
   */
  _leaveTopic (packet) {
    return new Promise((resolve, reject) => {
      /**
       * The leave packet is invalid, since the topic name is missing
       */
      if (!msp.isValidLeavePacket(packet)) {
        return reject(msp.leaveErrorPacket('unknown', 'Missing topic name'))
      }

      /**
       * Close subscription
       */
      this.closeSubscription(this.getSubscription(packet.d.topic))

      /**
       * Finally ACK the leave
       */
      resolve(msp.leaveAckPacket(packet.d.topic))
    })
  }

  /**
   * Invoked when connection receives an error
   *
   * @method _onError
   *
   * @return {void}
   *
   * @private
   */
  _onError (code, reason) {
    debug('connection error code:%s, reason:%s', code, reason)
    this._subscriptions.forEach((socket) => {
      socket.serverError(code, reason)
    })
  }

  /**
   * Invoked when TCP connection is closed. We will have to close
   * all the underlying subscriptions too.
   *
   * @method _onClose
   *
   * @return {void}
   *
   * @private
   */
  _onClose () {
    this._subscriptions.forEach((subscription) => (this.closeSubscription(subscription)))
    debug('closing underlying connection')

    this
      .emit('close', this)
      .then(() => (this.clearListeners()))
      .catch(() => (this.clearListeners()))
  }

  /**
   * Add a new subscription socket for a given topic
   *
   * @method addSubscription
   *
   * @param  {String}        topic
   * @param  {Socket}        subscription
   *
   * @returns {void}
   */
  addSubscription (topic, subscription) {
    debug('new subscription for %s topic', topic)

    subscription.on('close', this.deleteSubscription)
    this._subscriptions.set(topic, subscription)
  }

  /**
   * Returns a boolean whether there is a socket
   * for a given topic or not.
   *
   * @method hasSubscription
   *
   * @param  {String}  topic
   *
   * @return {Boolean}
   */
  hasSubscription (topic) {
    return this._subscriptions.has(topic)
  }

  /**
   * Returns the socket instance for a given topic
   * for a given channel
   *
   * @method getSubscription
   *
   * @param  {Object}  topic
   *
   * @return {Socket}
   */
  getSubscription (topic) {
    return this._subscriptions.get(topic)
  }

  /**
   * Closes the subscription for a given topic on connection
   *
   * @method closeSubscription
   *
   * @param  {Object}          subscription
   *
   * @return {void}
   */
  closeSubscription (subscription) {
    if (subscription) {
      subscription.serverClose()
    }
  }

  /**
   * Encodes the packet to be sent over the wire
   *
   * @method encodePacket
   *
   * @param  {Object}     packet
   * @param  {Function}   cb
   *
   * @return {void}
   */
  encodePacket (packet, cb) {
    this._encoder.encode(packet, (error, payload) => {
      if (error) {
        debug('encode: error %j', error)
        cb(error)
        return
      }

      cb(null, payload)
    })
  }

  /**
   * Sends the packet to the underlying connection by encoding
   * it.
   *
   * If socket connection is closed, the packet will be dropped
   *
   * @method sendPacket
   *
   * @param  {Object}   packet
   * @param  {Object}   [options]
   * @param  {Function} ack
   *
   * @return {void}
   */
  sendPacket (packet, options = {}, ack) {
    ack = typeof (ack) === 'function' ? ack : function () {}
    this.encodePacket(packet, (error, payload) => {
      if (error) {
        debug('encode: error %j', error)
        ack(error)
        return
      }

      this.write(payload, options, ack)
    })
  }

  /**
   * Writes to the underlying socket. Also this method
   * makes sure that the connection is open
   *
   * @method write
   *
   * @param  {String}   payload
   * @param  {Object}   options
   * @param  {Function} [ack]
   *
   * @return {void}
   */
  write (payload, options, ack) {
    ack = typeof (ack) === 'function' ? ack : function () {}

    if (this.readyState !== this.ws.constructor.OPEN) {
      this._notifyPacketDropped('sendPacket', 'packet dropped since connection is closed')
      ack(new Error('connection is closed'))
      return
    }

    this.ws.send(payload, options, ack)
  }

  /**
   * Sends the open packet on the connection as soon as
   * the connection has been made
   *
   * @method sendOpenPacket
   *
   * @package {Object} options
   *
   * @return {void}
   */
  sendOpenPacket (options) {
    this.sendPacket({ t: msp.codes.OPEN, d: options })
  }

  /**
   * Sends the leave packet, when the subscription to a channel
   * has been closed from the server.
   *
   * @method sendLeavePacket
   *
   * @param {String} topic
   *
   * @return {void}
   */
  sendLeavePacket (topic) {
    debug('initiating leave from server for %s topic', topic)
    this.sendPacket(msp.leavePacket(topic))
  }

  /**
   * Makes the event packet from the topic and the
   * body
   *
   * @method makeEventPacket
   *
   * @param  {String}        topic
   * @param  {String}        event
   * @param  {Mixed}         data
   *
   * @return {Object}
   */
  makeEventPacket (topic, event, data) {
    if (!topic) {
      throw new Error('Cannot send event without a topic')
    }

    if (!this.hasSubscription(topic)) {
      throw new Error(`Topic ${topic} doesn't have any active subscriptions`)
    }

    return msp.eventPacket(topic, event, data)
  }

  /**
   * Sends the event to the underlying connection
   *
   * @method sendEvent
   *
   * @param  {String}    topic
   * @param  {String}    event
   * @param  {Mixed}     data
   * @param  {Function}  [ack]
   *
   * @return {void}
   */
  sendEvent (topic, event, data, ack) {
    this.sendPacket(this.makeEventPacket(topic, event, data), {}, ack)
  }

  /**
   * Close the underlying ws connection. This method will
   * initiate a closing handshake.
   *
   * @method close
   *
   * @param  {Number} code
   * @param  {String} [reason]
   *
   * @return {void}
   */
  close (code, reason) {
    debug('closing connection from server')
    this.ws.close(code, reason)
  }

  /**
   * Terminates the connection forcefully. This is called when client
   * doesn't ping the server.
   *
   * @method terminate
   *
   * @package {String} reason
   *
   * @return {void}
   */
  terminate (reason) {
    debug('terminating connection: %s', reason)
    this.ws.terminate()
  }
}

module.exports = Connection
