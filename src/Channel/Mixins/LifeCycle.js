'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * MIXIN: This is a mixin and has access to the Channel
 *        class instance
*/

const util = require('../../../lib/util')

const LifeCycle = exports = module.exports = {}

/**
 * This method is invoked whenever a new socket joins a channel
 * and all middleware have been called. Here we initiate the
 * channel closure and pass around the socket and the
 * request to the constructor.
 *
 * @param  {Object} ws
 */
LifeCycle._onConnection = function (ws) {
  const self = this
  const closureInstance = new this._closure(ws.socket, ws.request, this.presence)
  ws.socket.setParentContext(closureInstance)

  /**
   * Hooking into disconnected method and clearing off the socket
   * from the wsPool. Also calling the custom disconnected method.
   */
  ws.socket.on('disconnect', () => this._onDisconnect(ws))

  /**
   * Hooking into join:ad:room event and following a better
   * join room approach
   */
  ws.socket.on('join:ad:room', function * (payload, fn) {
    yield self._onJoinRoom(ws.socket, ws.request, payload, fn)
  })

  /**
   * Hooking into leave:ad:room event and following a better
   * leave room approach
   */
  ws.socket.on('leave:ad:room', function * (payload, fn) {
    yield self._onLeaveRoom(ws.socket, ws.request, payload, fn)
  })

  /**
   * If channel closure is a class, we need to bind all class
   * methods starting with {on} as the event listeners for
   * corresponding events.
   */
  if (this._closureIsAClass) {
    const methods = Object.getOwnPropertyNames(this._closure.prototype)
    methods.forEach((method) => this._bindEventListener(closureInstance, ws.socket, method))
  }
}

/**
 * This method is invoked whenever a socket disconnects
 * and it also calls the disconnect method of the
 * channel if defined.
 *
 * @param  {Object} ws
 */
LifeCycle._onDisconnect = function (ws) {
  this._wsPool[ws.socket.id] = null
  this._disconnectedFn(ws.socket)
}

/**
 * Here we attach listeners for events defined as
 * function names on the socket class.
 *
 * @param {Object} closureInstance
 * @param {Object} socket
 * @param {String} method
 */
LifeCycle._bindEventListener = function (closureInstance, socket, method) {
  if (method.startsWith('on') && typeof (closureInstance[method]) === 'function') {
    socket.on(util.generateEventName(method), closureInstance[method])
  }
}
