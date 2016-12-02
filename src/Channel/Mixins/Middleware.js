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
 * MIXIN: This is a mixin and has access to the channel
 *        class instance.
 */

const co = require('co')
const Socket = require('../../Socket')
const Response = require('../../Response')

const Middleware = exports = module.exports = {}

/**
 * Initiating the socket by creating a new AdonisSocket
 * instance and saving it inside the socket pool.
 */
Middleware._initiateSocket = function () {
  this.io.use((socket, next) => {
    this._wsPool[socket.id] = {
      socket: new Socket(this.io, socket),
      request: new this.Request(socket.request, new Response())
    }
    next()
  })
}

/**
 * Calling custom middleware by looping over them and
 * throwing an error if any middleware throws error.
 */
Middleware._callCustomMiddleware = function () {
  this.io.use((socket, next) => {
    const middlewareList = this._middleware._store.root
    if (!middlewareList || !middlewareList.length) {
      next()
      return
    }

    const ws = this.get(socket.id)
    const composedFn = this._middleware.withParams(ws.socket, ws.request).compose()
    co(function * () {
      yield composedFn()
    })
    .then(() => next())
    .catch(next)
  })
}
