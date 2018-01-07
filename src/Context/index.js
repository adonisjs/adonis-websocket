'use strict'

/*
 * adonis-websocket
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Macroable = require('macroable')

/**
 * An instance of this class is passed to all route handlers
 * and middleware. Also different part of applications
 * can bind getters to this class.
 *
 * @binding Adonis/Adons/WsContext
 * @alias WsContext
 * @group Ws
 *
 * @class WsContext
 * @constructor
 *
 */
const Socket = require('../Socket')

class WsContext extends Macroable {
  constructor (io, socket) {
    super()

    /**
     * Node.js socket.io object
     *
     * @attribute io
     *
     * @type {Object}
     */
    this.io = io

    /**
     * Node.js socket of socket.io object when connect
     *
     * @attribute _socket
     *
     * @type {Object}
     */
    this._socket = socket

     /**
     * Node.js socket object
     *
     * @attribute socket
     *
     * @type {Object}
     */
    this.socket = new Socket(io, socket)

    this.constructor._readyFns
      .filter((fn) => typeof (fn) === 'function')
      .forEach((fn) => fn(this))
  }

  /**
   * Hydrate the context constructor
   *
   * @method hydrate
   *
   * @return {void}
   */
  static hydrate () {
    super.hydrate()
    this._readyFns = []
  }

  /**
   * Define onReady callbacks to be executed
   * once the request context is instantiated
   *
   * @method onReady
   *
   * @param  {Function} fn
   *
   * @chainable
   */
  static onReady (fn) {
    this._readyFns.push(fn)
    return this
  }
}

/**
 * Defining _macros and _getters property
 * for Macroable class
 *
 * @type {Object}
 */
WsContext._macros = {}
WsContext._getters = {}
WsContext._readyFns = []

module.exports = WsContext
