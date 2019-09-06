'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const EVENT_TYPE = 'adonis:hop'

module.exports = {
  /**
   * Serialize data for sending as process message.
   *
   * @method serialize
   *
   * @param  {Object} data
   *
   * @return {Object}
   */
  serialize (data) {
    return { type: EVENT_TYPE, data }
  },

  /**
   * Deserialize recieved process message.
   *
   * @method deserialize
   *
   * @param  {Object} message
   *
   * @return {Object}
   */
  deserialize (message) {
    if (message.type === EVENT_TYPE) {
      return message.data
    }

    throw new Error('Recieved message has different event type.')
  }
}
