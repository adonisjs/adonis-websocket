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
 * @param  {Object}    context
 * @param  {Object}    payload
 * @param  {Function}  [callback]
 */
Rooms._onJoinRoom = async function (context, payload, callback) {
  callback = callback || function () {}
  const roomJoinFn = this._roomJoinFn
  try {
    util.isGenerator(roomJoinFn) ? await roomJoinFn(context, payload) : roomJoinFn(context, payload)
    context.socket.join(payload.room)
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
 * @param  {Object}    context
 * @param  {Object}    payload
 * @param  {Function}  callback
 */
Rooms._onLeaveRoom = async function (context, payload, callback) {
  callback = callback || function () {}
  const roomLeaveFn = this._roomLeaveFn
  try {
    util.isGenerator(roomLeaveFn) ? await roomLeaveFn(context, payload) : roomLeaveFn(context, payload)
    context.socket.leave(payload.room)
    callback(null, true)
  } catch (error) {
    callback(error.message, false)
  }
}
