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
const CE = require('../Exceptions')
const Resetable = require('../../lib/Resetable')

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
    this._emitScope = new Resetable({
      scope: 'notme',
      ids: [],
      rooms: []
    })

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

  /**
   * Returns the socket id
   *
   * @return {String}
   */
  get id () {
    return this.socket.id
  }

  /**
   * Returns the list of socket rooms
   *
   * @return {Object}
   */
  get rooms () {
    return this.socket.rooms
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
    this.io.emit.apply(this.io, args)
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
   * Send a message to a single room
   *
   * @param {String} room
   *
   * @return {Object} reference to {this} for chaining
   */
  inRoom (room) {
    const emitScope = this._emitScope.get()
    if (emitScope.scope === 'me') {
      throw CE.RuntimeException.invalidAction('You are trying to send a message to yourself inside a room. Instead use toMe().emit()')
    }
    emitScope.rooms = [room]
    this._emitScope.set(emitScope)
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
    const emitScope = this._emitScope.get()
    if (emitScope.scope === 'me') {
      throw CE.RuntimeException.invalidAction('You are trying to send a message to yourself inside a room. Instead use toMe().emit()')
    }
    emitScope.rooms = rooms
    this._emitScope.set(emitScope)
    return this
  }

  /**
   * Emit messages to everyone.
   *
   * @return {Object} reference to {this} for chaining
   */
  toEveryone () {
    const emitScope = this._emitScope.get()
    emitScope.scope = 'everyone'
    this._emitScope.set(emitScope)
    return this
  }

  /**
   * Emit message to me only.
   *
   * @return {Object} reference to {this} for chaining
   */
  toMe () {
    const emitScope = this._emitScope.get()
    emitScope.scope = 'me'
    this._emitScope.set(emitScope)
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
    const emitScope = this._emitScope.get()
    emitScope.ids = ids
    this._emitScope.set(emitScope)
    return this
  }

  /**
   * Emit messages to everyone but not me.
   *
   * @return {Object} reference to {this} for chaining
   */
  exceptMe () {
    const emitScope = this._emitScope.get()
    emitScope.scope = 'notme'
    this._emitScope.set(emitScope)
    return this
  }

  /**
   * Emitting message to the define scope, which is `notme` by
   * default.
   */
  emit () {
    const emitScope = this._emitScope.pull()

    /**
     * Here we send messages to list of selected
     * socket ids.
     */
    if (_.size(emitScope.ids)) {
      emitScope.ids.forEach((id) => {
        const to = this.io.to(id)
        to.emit.apply(to, _.toArray(arguments))
      })
      return
    }

    /**
     * If emitScope is a string then call one of the
     * define methods.
     */
    if (_.size(emitScope.rooms)) {
      emitScope.rooms.forEach((room) => {
        const to = emitScope.scope === 'notme' ? this.socket.broadcast.to(room) : this.io.to(room)
        const args = _.toArray(arguments)
        args.splice(1, 0, room)
        to.emit.apply(to, args)
      })
      return
    }

    const method = this._emitScopeMethods[emitScope.scope]
    this[method](_.toArray(arguments))
  }

  /**
   * Join a given room
   */
  join (room) {
    this.socket.join(room)
  }

  /**
   * Leave a given room
   */
  leave (room) {
    this.socket.leave(room)
  }

  disconnect () {
    this.socket.disconnect()
  }
}

module.exports = AdonisSocket
