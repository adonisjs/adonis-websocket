'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Macroable = require('macroable')

/**
 * An instance of this class is passed to all websocket
 * handlers and middleware.
 *
 * @binding Adonis/Src/WsContext
 * @alias WsContext
 * @group Ws
 *
 * @class WsContext
 * @constructor
 *
 * @example
 * ```js
 * const WsContext = use('WsContext')
 *
 * WsContext.getter('view', function () {
 *   return new View()
 * }, true)
 *
 * // The last option `true` means the getter is singleton.
 * ```
 */
class WsContext extends Macroable {
  constructor (req) {
    super()

    /**
     * Websocket req object
     *
     * @attribute req
     *
     * @type {Object}
     */
    this.req = req

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
