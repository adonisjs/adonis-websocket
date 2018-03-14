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
const debug = require('debug')('adonis:websocket')
const receiver = require('./receiver')
const sender = require('./sender')

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
      debug('adding listener from worker to receive node message')
      process.on('message', receiver)
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
      sender(handle, topic, payload)
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
    debug('cleaning up cluster listeners')
    process.removeListener('message', receiver)
  }
}
