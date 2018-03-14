'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ChannelsManager = require('../Channel/Manager')
const debug = require('debug')('adonis:websocket')

/**
 * Delivers the message from process to the channel
 *
 * @method deliverMessage
 *
 * @param  {String}       handle
 * @param  {String}       topic
 * @param  {String}       payload
 *
 * @return {void}
 */
function deliverMessage (handle, topic, payload) {
  if (handle === 'broadcast') {
    const channel = ChannelsManager.resolve(topic)

    if (!channel) {
      return debug('broadcast topic %s cannot be handled by any channel', topic)
    }

    channel.clusterBroadcast(topic, payload)
    return
  }

  debug('dropping packet, since %s handle is not allowed', handle)
}

/**
 * Handles the messages received on a given process
 *
 * @method handleProcessMessage
 *
 * @param  {String}             message
 *
 * @return {void}
 */
module.exports = function handleProcessMessage (message) {
  let decoded = null

  /**
   * Decoding the JSON message
   */
  try {
    decoded = JSON.parse(message)
  } catch (error) {
    debug('dropping packet, since not valid json')
    return
  }

  /**
   * Ignoring packet when there is no handle
   */
  if (!decoded.handle) {
    debug('dropping packet, since handle is missing')
    return
  }

  /**
   * Safely trying to deliver cluster messages
   */
  try {
    deliverMessage(decoded.handle, decoded.topic, decoded.payload)
  } catch (error) {
    debug('unable to process cluster message with error %o', error)
  }
}
