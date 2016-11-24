'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const util = require('../../lib/util')

class AdonisSocket {

  constructor (io, socket) {
    this.io = io
    this.socket = socket
    this.parentContext = null

    /**
     * Emit scope defines to whom the messages
     * should be emitted. Kind of a readable
     * way of emitting messages to selected
     * audience
     *
     * @type {String}
     */
    this._emitScope = 'notme'

    /**
     * Map of methods to the emit scope name
     *
     * @type {Object}
     */
    this._emitScopeMethods = {
      notme: '_emitWithoutMe',
      everyone: '_emitToEveryone',
      me: '_emitToMe'
    }
  }

  get id () {
    return this.socket.id
  }

  /**
   * Resets emit scope to the default scope
   */
  _resetEmitScope () {
    this._emitScope = 'notme'
  }

  /**
   * Emit messages to everyone without me.
   *
   * @param {Array} args
   */
  _emitWithoutMe (args) {
    this.socket.broadcast.emit.apply(this.socket, args)
  }

  /**
   * Emit messages to everyone including me.
   *
   * @param {Array} args
   */
  _emitToEveryone (args) {
    this.io.sockets.emit.apply(this.io.sockets, args)
  }

  /**
   * Emits a message to itself.
   *
   * @param {Array} args
   */
  _emitToMe (args) {
    this.socket.emit.apply(this.socket, args)
  }

  /**
   * Sets the parent context to be used for setting
   * the context of the event listeners. Basically
   * to override the value of {this} inside event
   * listeners
   */
  setParentContext (parentContext) {
    this.parentContext = parentContext
  }

  /**
   * Add a listener for a given event. Feel
   * free to attach a generator method or
   * Ioc container binding.
   *
   * @param {String} event
   * @param {Callback} cb
   */
  on (event, cb) {
    const wrappedCb = util.isGenerator(cb) ? util.wrapGenerator(cb) : cb
    const self = this
    this.socket.on(event, function () {
      wrappedCb.apply(self.parentContext, arguments)
    })
  }

  /**
   * Emit messages to everyone.
   *
   * @return {Object} reference to {this} for chaining
   */
  toEveryone () {
    this._emitScope = 'everyone'
    return this
  }

  /**
   * Emit message to me only.
   *
   * @return {Object} reference to {this} for chaining
   */
  toMe () {
    this._emitScope = 'me'
    return this
  }

  /**
   * Emit messages to given socket ids.
   *
   * @param {Array} ids
   *
   * @return {Object} reference to {this} for chaining
   */
  to (ids) {
    this._emitScope = ids
    return this
  }

  /**
   * Emit messages to everyone but not me.
   *
   * @return {Object} reference to {this} for chaining
   */
  exceptMe () {
    this._emitScope = 'notme'
    return this
  }

  /**
   * Emitting message to the define scope, which is `notme` by
   * default.
   */
  emit () {
    /**
     * If emitScope is a string then call one of the
     * define methods.
     */
    if (typeof (this._emitScope) === 'string') {
      const method = this._emitScopeMethods[this._emitScope]
      this[method](_.toArray(arguments))
      this._resetEmitScope()
      return
    }

    /**
     * Here we send messages to list of selected
     * socket ids.
     */
    if (_.isArray(this._emitScope)) {
      this._emitScope.forEach((id) => {
        const to = this.io.to(id)
        to.emit.apply(to, _.toArray(arguments))
      })
      this._resetEmitScope()
    }
  }
}

module.exports = AdonisSocket
