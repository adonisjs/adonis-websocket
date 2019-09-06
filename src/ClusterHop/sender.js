'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
const debug = require('debug')('adonis:websocket')
const { serialize } = require('./serializer')

module.exports = function (handle, topic, payload) {
  try {
    process.send(serialize({ handle, topic, payload }))
  } catch (error) {
    debug('cluster.send error %o', error)
  }
}
