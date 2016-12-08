'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * Websockets needs to make use of some common classes/middleware
 * used by Http request. Ideally response object is not used
 * when reading values for the request but still an empty
 * instance needs to be passed to avoid null identifier
 * exceptions.
 */

class Response {
}

module.exports = Response
