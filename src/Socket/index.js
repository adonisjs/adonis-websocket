'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Emittery = require('emittery')
const debug = require('debug')('adonis:websocket')
const GE = require('@adonisjs/generic-exceptions')
const ClusterHop = require('../ClusterHop')

/**
 * Socket is instance of a subscription for a given topic.
 * Socket will always have access to the channel and
 * it's parent connection.
 *
 * @class Socket
 *
 * @param {String}  topic
 * @param {Connect} connection
 */
class Socket {
  constructor (topic, connection) {
    this.channel = null

    /**
     * Below properties cannot be changed
     */
    Object.defineProperty(this, 'topic', {
      get () { return topic }
    })

    Object.defineProperty(this, 'connection', {
      get () { return connection }
    })

    Object.defineProperty(this, 'id', {
      get () { return `${topic}#${connection.id}` }
    })

    this.emitter = new Emittery()
  }

  /**
   * Associates the channel to the socket
   *
   * @method associateChannel
   *
   * @param  {Channel}         channel
   *
   * @return {void}
   */
  associateChannel (channel) {
    this.channel = channel
  }

  /* istanbul ignore next */
  /**
   * Bind a listener
   *
   * @method on
   *
   * @param  {...Spread} args
   *
   * @return {void}
   */
  on (...args) {
    return this.emitter.on(...args)
  }

  /* istanbul ignore next */
  /**
   * Bind a listener for one time only
   *
   * @method once
   *
   * @param  {...Spread} args
   *
   * @return {void}
   */
  once (...args) {
    return this.emitter.once(...args)
  }

  /* istanbul ignore next */
  /**
   * Remove listener
   *
   * @method off
   *
   * @param  {...Spread} args
   *
   * @return {void}
   */
  off (...args) {
    return this.emitter.off(...args)
  }

  /**
   * Emit message to the client
   *
   * @method emit
   *
   * @param  {String}   event
   * @param  {Object}   data
   * @param  {Function} [ack]
   *
   * @return {void}
   */
  emit (event, data, ack) {
    this.connection.sendEvent(this.topic, event, data, ack)
  }

  /**
   * Broadcast event to everyone except the current socket.
   *
   * @method broadcast
   *
   * @param  {String}   event
   * @param  {Mixed}    data
   *
   * @return {void}
   */
  broadcast (event, data) {
    const packet = this.connection.makeEventPacket(this.topic, event, data)

    /**
     * Encoding the packet before hand, so that we don't pay the penalty of
     * re-encoding the same message again and again
     */
    this.connection.encodePacket(packet, (error, payload) => {
      if (error) {
        return
      }
      this.channel.broadcastPayload(this.topic, payload, [this.id])
      ClusterHop.send('broadcast', this.topic, payload)
    })
  }

  /**
   * Broadcasts the message to everyone who has joined the
   * current topic.
   *
   * @method broadcastToAll
   *
   * @param  {String}       event
   * @param  {Mixed}       data
   *
   * @return {void}
   */
  broadcastToAll (event, data) {
    const packet = this.connection.makeEventPacket(this.topic, event, data)

    /**
     * Encoding the packet before hand, so that we don't pay the penalty of
     * re-encoding the same message again and again
     */
    this.connection.encodePacket(packet, (error, payload) => {
      if (error) {
        return
      }
      this.channel.broadcastPayload(this.topic, payload, [])
      ClusterHop.send('broadcast', this.topic, payload)
    })
  }

  /**
   * Emit event to selected socket ids
   *
   * @method emitTo
   *
   * @param  {String} event
   * @param  {Mixed}  data
   * @param  {Array}  ids
   *
   * @return {void}
   */
  emitTo (event, data, ids) {
    if (!Array.isArray(ids)) {
      throw GE.InvalidArgumentException.invalidParameter('emitTo expects 3rd parameter to be an array of socket ids', ids)
    }

    const packet = this.connection.makeEventPacket(this.topic, event, data)

    /**
     * Encoding the packet before hand, so that we don't pay the penalty of
     * re-encoding the same message again and again
     */
    this.connection.encodePacket(packet, (error, payload) => {
      if (error) {
        return
      }
      this.channel.broadcastPayload(this.topic, payload, ids, true)
      ClusterHop.send('broadcast', this.topic, payload)
    })
  }

  /**
   * Invoked when internal connection gets a TCP error
   *
   * @method serverError
   *
   * @param  {Number}    code
   * @param  {String}    reason
   *
   * @return {void}
   */
  serverError (code, reason) {
    this.emitter.emit('error', { code, reason })
  }

  /**
   * A new message received
   *
   * @method serverMessage
   *
   * @param  {String}      options.event
   * @param  {Mixed}       options.data
   *
   * @return {void}
   */
  serverMessage ({ event, data }) {
    this.emitter.emit(event, data)
  }

  /**
   * Close the subscription, when client asks for it
   * or when server connection closes
   *
   * @method serverClose
   *
   * @return {Promise}
   */
  serverClose () {
    return this.emitter
      .emit('close', this)
      .then(() => {
        this.emitter.clearListeners()
      })
      .catch(() => {
        this.emitter.clearListeners()
      })
  }

  /**
   * Close the subscription manually
   *
   * @method close
   *
   * @return {Promise}
   */
  close () {
    debug('self closing subscription for %s topic', this.topic)

    return this
      .serverClose()
      .then(() => {
        this.connection.sendLeavePacket(this.topic)
      })
  }
}

module.exports = Socket
