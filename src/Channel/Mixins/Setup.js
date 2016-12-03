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
const Middleware = require('../../Middleware')
const Response = require('../../Response')

const Setup = exports = module.exports = {}

/**
 * Initiating the socket by creating a new AdonisSocket
 * instance and saving it inside the socket pool.
 */
Setup._initiateSocket = function () {
  this.io.use((socket, next) => {
    const request = new this.Request(socket.request, new Response())
    const session = new this.Session(socket.request, new Response())
    request.session = session
    this._wsPool[socket.id] = {
      socket: new Socket(this.io, socket),
      request: request
    }
    next()
  })
}

/**
 * Calling custom middleware by looping over them and
 * throwing an error if any middleware throws error.
 */
Setup._callCustomMiddleware = function () {
  this.io.use((socket, next) => {
    const middlewareList = Middleware.resolve(this._middleware, true)
    if (!middlewareList.length) {
      next()
      return
    }

    const ws = this.get(socket.id)
    const composedFn = Middleware.compose(middlewareList, ws.socket, ws.request)
    co(function * () {
      yield composedFn()
    })
    .then(() => next())
    .catch(next)
  })
}
