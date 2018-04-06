'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Channel = require('./index')

/**
 * Manages the list of registered channels. Also this class is used to return
 * the matching channel for a given topic.
 *
 * @class ChannelsManager
 */
class ChannelsManager {
  constructor () {
    this.channels = new Map()
    this._channelExpressions = []
  }

  /**
   * Normalizes the channel name by removing starting and
   * ending slashes
   *
   * @method _normalizeName
   *
   * @param  {String}       name
   *
   * @return {String}
   *
   * @private
   */
  _normalizeName (name) {
    return name.replace(/^\/|\/$/, '')
  }

  /**
   * Generates regex expression for the channel name, it is
   * used to match topics and find the right channel for it.
   *
   * @method _generateExpression
   *
   * @param  {String}            name
   *
   * @return {RegExp}
   *
   * @private
   */
  _generateExpression (name) {
    return name.endsWith('*') ? new RegExp(`^${name.replace(/\*$/, '\\w+')}`) : new RegExp(`^${name}$`)
  }

  /**
   * Resets channels array
   *
   * @method clear
   *
   * @return {void}
   */
  clear () {
    this.channels = new Map()
    this._channelExpressions = []
  }

  /**
   * Adds a new channel to the store
   *
   * @method add
   *
   * @param  {String} name
   * @param  {Function} onConnect
   */
  add (name, onConnect) {
    name = this._normalizeName(name)

    /**
     * Instantiating a new channel
     *
     * @type {Channel}
     */
    const channel = new Channel(name, onConnect)

    /**
     * Generate expressions for matching topics
     * and resolving channel.
     */
    this.channels.set(name, channel)
    this._channelExpressions.push({ expression: this._generateExpression(name), name })

    return channel
  }

  /**
   * Returns an existing channel instance
   *
   * @method get
   *
   * @param  {String} name
   *
   * @return {Channel}
   */
  get (name) {
    return this.channels.get(name)
  }

  /**
   * Returns channel for a given topic
   *
   * @method resolve
   *
   * @param  {String} topic
   *
   * @return {Channel|Null}
   */
  resolve (topic) {
    const matchedExpression = this._channelExpressions.find((expression) => expression.expression.test(topic))
    return matchedExpression ? this.channels.get(matchedExpression.name) : null
  }
}

module.exports = new ChannelsManager()
