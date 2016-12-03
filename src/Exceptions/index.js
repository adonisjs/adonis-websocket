'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const NE = require('node-exceptions')

class RuntimeException extends NE.RuntimeException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when a named middleware is used
   * but not registered
   *
   * @param  {String} name
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static missingNamedMiddleware (name, code) {
    return new this(`${name} is not registered as a named middleware for Websockets`, code || this.defaultErrorCode, 'E_MISSING_NAMED_MIDDLEWARE')
  }

  /**
   * this exception is raised when trying to call an undefined
   * method.
   *
   * @param  {String} message
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static invalidAction (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_UNDEFINED_METHOD')
  }

  /**
   * this exception is raised when trying to access an uninitialized
   * channel.
   *
   * @param  {String} name
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static uninitializedChannel (name, code) {
    return new this(`Trying to access uninitialized channel ${name}`, code || this.defaultErrorCode, 'E_UNINITIALIZED_METHOD')
  }
}

class InvalidArgumentException extends NE.InvalidArgumentException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when a method parameter value
   * is invalid.
   *
   * @param  {String} message
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static invalidParameter (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_INVALID_PARAMETER')
  }
}

module.exports = { InvalidArgumentException, RuntimeException }
