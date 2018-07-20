'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

module.exports = {
  /**
   * Serialize data for sending as process message.
   *
   * @method serialize
   *
   * @param  {Object} data
   *
   * @return {String}
   */
  serialize (data) {
    return JSON.stringify(data)
  },

  /**
   * Deserialize recieved process message.
   *
   * @method deserialize
   *
   * @param  {String} message
   *
   * @return {Object}
   */
  deserialize (message) {
    return JSON.parse(message)
  }
}
