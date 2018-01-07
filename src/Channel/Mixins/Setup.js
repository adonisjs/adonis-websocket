'use strict'

/**
 * MIXIN: This is a mixin and has access to the channel
 *        class instance.
 */

const co = require('co')
const Middleware = require('../../Middleware')
const debug = require('debug')('adonis:websocket')

const Setup = exports = module.exports = {}

/**
 * Initiating the socket by creating a new AdonisSocket
 * instance and saving it inside the socket pool.
 */
Setup._initiateSocket = function () {
  this.io.use((socket, next) => {
    const context = new this.Context(this.io, socket)
    this._ctxPool[socket.id] = context
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

    const context = this.get(socket.id)
    debug('context', 'have context')
    const composedFn = Middleware.compose(middlewareList, context)
    co(async function () {
      await composedFn()
    })
    .then(() => next())
    .catch((error) => {
      debug('error', error)
      next(error)
    })
  })
}
