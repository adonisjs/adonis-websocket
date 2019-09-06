'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

if (typeof (process.env.pm_id) !== 'undefined') {
  module.exports = require('./pm2')
} else {
  module.exports = require('./cluster')
}
