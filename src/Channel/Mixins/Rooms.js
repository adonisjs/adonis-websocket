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
const Rooms = exports = module.exports = {}

/**
 * This method is invoked whenever a socket tries to
 * join a room. It also invokes the joinRoom method
 * on channel/closure instance if defined.
 *
 * @param  {Object}    socket
 * @param  {Object}    request
 * @param  {Object}    payload
 * @param  {Function}  [callback]
 */
Rooms._onJoinRoom = function * (socket, request, payload, callback) {
  callback = callback || function () {}
  const roomJoinFn = this._roomJoinFn
  try {
    util.isGenerator(roomJoinFn) ? yield roomJoinFn(payload.room, payload.body, socket) : roomJoinFn(payload.room, payload.body, socket)
    socket.join(payload.room)
    callback(null, true)
  } catch (error) {
    callback(error.message, false)
  }
}

/**
 * This method is invoked whenever a socket wants to leave
 * a room. It also invokes the channel/closure instance
 * leaveRoom method if defined.
 *
 * @param  {Object}    socket
 * @param  {Object}    request
 * @param  {Object}    payload
 * @param  {Function}  callback
 */
Rooms._onLeaveRoom = function * (socket, request, payload, callback) {
  callback = callback || function () {}
  const roomLeaveFn = this._roomLeaveFn
  try {
    util.isGenerator(roomLeaveFn) ? yield roomLeaveFn(payload.room, payload.body, socket) : roomLeaveFn(payload.room, payload.body, socket)
    socket.leave(payload.room)
    callback(null, true)
  } catch (error) {
    callback(error.message, false)
  }
}
