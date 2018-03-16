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
  name: 'json',

  /**
   * Encode a value by stringifying it
   *
   * @method encode
   *
   * @param  {Object}   payload
   * @param  {Function} callback
   *
   * @return {void}
   */
  encode (payload, callback) {
    let encoded = null

    try {
      encoded = JSON.stringify(payload)
    } catch (error) {
      return callback(error)
    }
    callback(null, encoded)
  },

  /**
   * Decode value by parsing it
   *
   * @method decode
   *
   * @param  {String}   payload
   * @param  {Function} callback
   *
   * @return {void}
   */
  decode (payload, callback) {
    let decoded = null

    try {
      decoded = JSON.parse(payload)
    } catch (error) {
      return callback(error)
    }
    callback(null, decoded)
  }
}
