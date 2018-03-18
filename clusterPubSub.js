'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const cluster = require('cluster')
const debug = require('debug')('adonis:websocket')

/**
 * Calls a callback by looping over cluster workers
 *
 * @method worketIterator
 *
 * @param  {Function} callback
 *
 * @return {void}
 */
function workerIterator (callback) {
  Object.keys(cluster.workers).forEach((index) => callback(cluster.workers[index]))
}

/**
 * Delivers the message to all the cluster workers, apart from the
 * one that sends the message
 *
 * @method deliverMessage
 *
 * @param  {String}       message
 *
 * @return {void}
 */
function deliverMessage (message) {
  workerIterator((worker) => {
    if (this.process.pid === worker.process.pid) {
      return
    }
    debug('delivering message to %s', worker.process.pid)
    worker.send(message)
  })
}

module.exports = function () {
  if (!cluster.isMaster) {
    throw new Error('clusterPubSub can be only be used with cluster master')
  }
  workerIterator((worker) => worker.on('message', deliverMessage))
}
