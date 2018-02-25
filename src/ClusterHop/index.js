'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const cluster = require('cluster')
const debug = require('debug')('adonis:websocket:cluster')
const ChannelsManager = require('../Channel/Manager')

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
      return debug('broadcast packet must have a topic')
    }

    channel.clusterMessage(topic, payload)
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
function handleProcessMessage (message) {
  try {
    const { topic, handle, payload } = JSON.parse(message)
    if (!handle) {
      debug('dropping packet, since handle is missing')
    }
    deliverMessage(handle, topic, payload)
  } catch (error) {
    debug('dropping packet, since not valid json')
  }
}

module.exports = {
  /**
   * Bind listener to listen for process message
   *
   * @method init
   *
   * @return {void}
   */
  init () {
    if (cluster.isWorker) {
      process.on('message', handleProcessMessage)
    }
  },

  /**
   * Sends a message out from the process. The cluster should bind
   * listener for listening messages.
   *
   * @method send
   *
   * @param  {String} handle
   * @param  {String} topic
   * @param  {Object} payload
   *
   * @return {void}
   */
  send (handle, topic, payload) {
    if (cluster.isWorker) {
      process.send(JSON.stringify({ handle, topic, payload }))
    }
  },

  /**
   * Clear up event listeners
   *
   * @method destroy
   *
   * @return {void}
   */
  destroy () {
    process.removeListener('message', handleProcessMessage)
  }
}
