'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const WebSocket = require('ws')
const GE = require('@adonisjs/generic-exceptions')
const MsgPack = require('@adonisjs/msgpack-encoder')

const Connection = require('../Connection')
const ClusterHop = require('../ClusterHop')
const ChannelManager = require('../Channel/Manager')

/**
 * The websocket server is a wrapper over `ws` node library and
 * written for AdonisJs specifically.
 *
 * @class Ws
 *
 * @package {Config} Config - Reference of Config provider
 */
class Ws {
  constructor (Config) {
    this._options = Config.merge('app.ws', {
      path: '/adonis-ws',
      serverInterval: 30000,
      serverAttempts: 3,
      clientInterval: 25000,
      clientAttempts: 3
    })

    /**
     * These options are passed directly to the `Websocket.Server` constructor
     *
     * @type {Object}
     */
    this._serverOptions = {
      path: this._options.path,
      verifyClient: this._verifyClient.bind(this)
    }

    /**
     * The function to be called on connection
     * handshake
     *
     * @type {Function}
     */
    this._handshakeFn = null

    /**
     * Reference to actual websocket server. It will
     * be set when `listen` method is called.
     *
     * @type {Websocket.Server}
     */
    this._wsServer = null

    /**
     * Encoder to be used for encoding the messages
     *
     * @type {Encoders}
     */
    this._encoder = this._options.encoder || new MsgPack()

    /**
     * Tracking all the connections, this is required to play
     * ping/pong
     *
     * @type {Set}
     */
    this._connections = new Set()

    /**
     * The timer initiated for monitoring connections
     * and terminating them if they are dead.
     *
     * @type {Timer}
     */
    this._heartBeatTimer = null
  }

  /**
   * Verifies the handshake of a new connection.
   *
   * @method _verifyClient
   *
   * @param  {Object}      info
   * @param  {Function}      ack
   *
   * @return {void}
   *
   * @private
   */
  async _verifyClient (info, ack) {
    if (typeof (this._handshakeFn) !== 'function') {
      return ack(true)
    }

    try {
      await this._handshakeFn(info)
      ack(true)
    } catch (error) {
      ack(false, error.status, error.message)
    }
  }

  /**
   * Bind a single function to validate the handshakes
   *
   * @method onHandshake
   *
   * @param  {Function}  fn
   *
   * @chainable
   */
  onHandshake (fn) {
    if (typeof (fn) !== 'function') {
      throw GE.InvalidArgumentException.invalidParameter('Ws.onHandshake accepts a function', fn)
    }

    this._handshakeFn = fn
    return this
  }

  /**
   * Register a new channel to accept topic subscriptions
   *
   * @method channel
   *
   * @param  {...Spread} args
   *
   * @return {Channel}
   */
  channel (...args) {
    return ChannelManager.add(...args)
  }

  /**
   * Handle a new connection
   *
   * @method handle
   *
   * @param  {Object} ws
   * @param  {Object} req
   *
   * @return {void}
   */
  handle (ws, req) {
    const connection = new Connection(ws, req, this._encoder)
    connection.on('close', (__connection__) => {
      this._connections.delete(__connection__)
    })

    connection.sendOpenPacket({
      connId: connection.id,
      serverInterval: this._options.serverInterval,
      serverAttempts: this._options.serverAttempts,
      clientInterval: this._options.clientInterval,
      clientAttempts: this._options.clientAttempts
    })

    this._connections.add(connection)
  }

  /**
   * Start the websocket server
   *
   * @method listen
   *
   * @param  {Http.Server} server
   *
   * @return {void}
   */
  listen (server) {
    this._wsServer = new WebSocket.Server(Object.assign({}, this._serverOptions, { server }))
    ClusterHop.init()

    /**
     * Listening for new connections
     */
    this._wsServer.on('connection', this.handle.bind(this))

    /**
     * Monitoring connections
     */
    this._heartBeatTimer = setInterval(() => {
      this._connections.forEach((connection) => {
        if (connection.pingElapsed >= this._options.serverAttempts) {
          connection.terminate()
        } else {
          connection.pingElapsed++
        }
      })
    }, this._options.serverInterval)
  }

  /**
   * Closes the websocket server
   *
   * @method close
   *
   * @return {void}
   */
  close () {
    ChannelManager.clear()
    ClusterHop.destroy()

    if (this._wsServer) {
      this._connections.forEach((connection) => connection.terminate('closing server'))
      this._wsServer.close()
      clearInterval(this._heartBeatTimer)
    }
  }
}

module.exports = Ws
