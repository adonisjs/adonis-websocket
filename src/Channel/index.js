'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Socket = require('../Socket')
const Response = require('../Response')
const co = require('co')
const util = require('../../lib/util')
const _ = require('lodash')

class Channel {

  constructor (io, Request, name, closure) {
    this.io = name === '/' ? io : io.of(name)
    /**
     * A reference to the closure, it will be executed after
     * all middleware and the connected method.
     */
    this._closure = closure
    this._isClosureAClass = util.isClass(closure)
    this.Request = Request
    this._middleware = []

    /**
     * Reference to the instances of Adonis Socket class
     * required to emit messages outside of the socket
     * loop
     * @type {Object}
     */
    this._wsPool = {}
    this._emitTo = []

    this._disconnectedFn = function () {}
    this._decorateSocket()
    this._bindMiddlewareFn()
    this._bindConnection()
  }

  /**
   * Here we execute all the middleware.
   */
  _bindMiddlewareFn () {
    this.io.use((socket, next) => {
      if (!this._middleware.length) {
        next()
        return
      }
      const _middleware = this._middleware
      const ws = this._wsPool[socket.id]
      co(function * () {
        yield util.composeMiddleware(_middleware, ws.socket, ws.request)
      })
      .then(() => {
        next()
      })
      .catch(next)
    })
  }

  /**
   * Here we push AdonisSocket to the list of sockets
   * Same instance is passed along all the middleware
   * and the final socket closure
   */
  _decorateSocket () {
    this.io.use((socket, next) => {
      this._wsPool[socket.id] = {
        socket: new Socket(this.io, socket),
        request: new this.Request(socket.request, new Response())
      }
      next()
    })
  }

  /**
   * Invokes the channel controller, which can be a class or
   * a normal function. We make sure to pass the context to
   * the socket instance to rebind the instance on event
   * listeners.
   *
   * @param {Object} socket - Instance of AdonisSocket
   */
  _invokeClosure (ws) {
    const closureInstance = new this._closure(ws.socket, ws.request)
    ws.socket.setParentContext(closureInstance)

    ws.socket.on('disconnect', () => {
      this._wsPool[ws.socket.socket.id] = null
      this._disconnectedFn(ws.socket)
    })

    if (this._isClosureAClass) {
      const methods = Object.getOwnPropertyNames(this._closure.prototype)
      methods.forEach((method) => this._bindEventListeners(closureInstance, ws.socket, method))
    }
  }

  /**
   * Here we attach listeners for events defined as
   * function names on the socket class.
   *
   * @param {Object} closureInstance
   * @param {Object} socket
   * @param {String} method
   */
  _bindEventListeners (closureInstance, socket, method) {
    if (method.startsWith('on') && typeof (closureInstance[method]) === 'function' && method !== 'onDisconnect') {
      socket.on(util.generateEventName(method), closureInstance[method])
    }
  }

  /**
   * Listening to the connect event and executing the
   * closure when the connected method works fine.
   */
  _bindConnection () {
    this.io.on('connection', (socket) => {
      this._invokeClosure(this._wsPool[socket.id])
    })
  }

  /**
   * Method to be disconnected everytime a new client
   * disconnects.
   *
   * @param {Function} fn
   */
  disconnected (fn) {
    if (typeof (fn) !== 'function') {
      throw new Error('Make sure to pass a function to the disconnected')
    }
    this._disconnectedFn = util.isGenerator(fn) ? util.wrapGenerator(fn) : fn
  }

  /**
   * Add a middleware to the middleware stack
   *
   * @param {...Spread} middleware
   */
  middleware () {
    let args = _.toArray(arguments)
    args = _.isArray(args[0]) ? args[0] : args
    this._middleware = this._middleware.concat(args)
  }

  /**
   * Emit messages to selected socket ids
   *
   * @param {Array} ids
   */
  to (ids) {
    this._emitTo = ids
    return this
  }

  /**
   * Emit an event to all sockets or selected sockets.
   */
  emit () {
    if (_.size(this._emitTo)) {
      this._emitTo.forEach((id) => {
        const to = this.io.to(id)
        to.emit.apply(to, _.toArray(arguments))
      })
      this._emitTo = []
      return
    }
    this.io.sockets.emit.apply(this.io.sockets, arguments)
  }

  /**
   * Returns socket instance using its id
   *
   * @param  {String} id
   *
   * @return {Object}
   */
  get (id) {
    return this._wsPool[id].socket
  }
}

module.exports = Channel
