'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const mixin = require('es6-class-mixin')
const _ = require('lodash')
const ComposeMiddleware = require('co-compose')
const Mixins = require('./Mixins')
const util = require('../../lib/util')
const Resetable = require('../../lib/Resetable')

class Channel {

  constructor (io, Request, name, closure) {
    this.io = name === '/' ? io : io.of(name)

    /**
     * A reference to the closure, it will be executed after
     * all middleware method.
     *
     * @type {Function|Class}
     */
    this._closure = closure

    /**
     * A boolean to know whether closure is a class or not. When
     * closure is a class we call class methods for LifeCycle
     * events.
     *
     * @type {Boolean}
     */
    this._closureIsAClass = util.isClass(closure)

    /**
     * Adonis Request class to be initiated upon new socket
     * connection. It makes it easy to read info from the
     * request similar to the way we do it in controllers.
     *
     * @type {Class}
     */
    this.Request = Request

    /**
     * Custom middleware to be executed for each socket
     * connection.
     *
     * @type {Array}
     */
    this._middleware = new ComposeMiddleware()

    /**
     * Reference to the instances of Adonis Socket class
     * required to emit messages outside of the socket
     * loop.
     *
     * @type {Object}
     */
    this._wsPool = {}

    /**
     * Runtime variable to store the scope
     * of emit.
     *
     * @type {Array}
     */
    this._emitTo = new Resetable([])

    /**
     * The method to be invoked whenever someone leaves
     * the channel.
     *
     * @type {Function}
     */
    this._disconnectedFn = this._closureIsAClass && this._closure.prototype.disconnected
    ? util.wrapIfGenerator(this._closure.prototype.disconnected)
    : function () {}

    /**
     * The method to be invoked whenever someone wants to
     * join a given room.
     *
     * @type {Function}
     */
    this._roomJoinFn = this._closureIsAClass && this._closure.prototype.joinRoom
    ? util.wrapIfGenerator(this._closure.prototype.joinRoom)
    : function () {}

    /**
     * The method to be invoked whenever someone wants to
     * leave a given room.
     *
     * @type {Function}
     */
    this._roomLeaveFn = this._closureIsAClass && this._closure.prototype.leaveRoom
    ? util.wrapIfGenerator(this._closure.prototype.leaveRoom)
    : function () {}

    /**
     * Lifecycle methods to be called as soon as
     * a channel is instantiated. Never change
     * the execution order of below methods
     */
    this._initiateSocket()
    this._callCustomMiddleware()

    /**
     * Hook into new connection and invoke the
     * channel closure.
     */
    this.io.on('connection', (socket) => this._onConnection(this._wsPool[socket.id]))
  }

  /**
   * Add a middleware to the middleware stack
   *
   * @param {...Spread} middleware
   */
  middleware (middleware) {
    const args = _.isArray(middleware) ? middleware : _.toArray(arguments)
    this._middleware.register(args)
    return this
  }

  /**
   * Send a message to a single room
   *
   * @param {String} room
   *
   * @return {Object} reference to {this} for chaining
   */
  inRoom (room) {
    this._emitTo.set([room])
    return this
  }

  /**
   * Send a message to multiple rooms
   *
   * @param {Array} rooms
   *
   * @return {Object} reference to {this} for chaining
   */
  inRooms (rooms) {
    this._emitTo.set(rooms)
    return this
  }

  /**
   * Emit messages to selected socket ids
   *
   * @param {Array} ids
   */
  to (ids) {
    this._emitTo.set(ids)
    return this
  }

  /**
   * Emit an event to all sockets or selected sockets.
   */
  emit () {
    const emitTo = this._emitTo.pull()
    const args = _.toArray(arguments)
    if (_.size(emitTo)) {
      emitTo.forEach((id) => {
        const to = this.io.to(id)
        to.emit.apply(to, args)
      })
      return
    }
    this.io.sockets.emit.apply(this.io.sockets, args)
  }

  /**
   * Returns socket instance using its id
   *
   * @param  {String} id
   *
   * @return {Object}
   */
  get (id) {
    return this._wsPool[id]
  }

  /**
   * Method to be disconnected everytime a new client
   * disconnects.
   *
   * @param {Function} fn
   */
  disconnected (fn) {
    if (typeof (fn) !== 'function') {
      throw new Error('Make sure to pass a function for disconnected event')
    }
    this._disconnectedFn = util.wrapIfGenerator(fn)
  }

  /**
   * The action to be executed whenever a user tries
   * to join a room. This is the best place make
   * sure only allowed users join the room.
   *
   * @return {Object} reference to this for chaining
   */
  joinRoom (fn) {
    if (typeof (fn) !== 'function') {
      throw new Error('Make sure to pass a function for joinRoom event')
    }
    this._roomJoinFn = util.wrapIfGenerator(fn)
    return this
  }

  /**
   * The action to be executed whenever a user tries
   * to join a room. This is the best place make
   * sure only allowed users join the room.
   *
   * @return {Object} reference to this for chaining
   */
  leaveRoom (fn) {
    if (typeof (fn) !== 'function') {
      throw new Error('Make sure to pass a function for leaveRoom event')
    }
    this._roomLeaveFn = util.wrapIfGenerator(fn)
    return this
  }
}

class ExtendedChannel extends mixin(
  Channel,
  Mixins.Middleware,
  Mixins.LifeCycle,
  Mixins.Rooms
) {}

module.exports = ExtendedChannel
