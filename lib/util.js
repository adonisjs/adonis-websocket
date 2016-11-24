'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const co = require('co')
const _ = require('lodash')

const util = exports = module.exports = {}

const toStr = Object.prototype.toString
const fnToStr = Function.prototype.toString
const isFnRegex = /^\s*(?:function)?\*/

/**
 * Tells whether a method is a generator function
 * or not.
 * @param  {Function}  fn
 *
 * @return {Boolean}
 */
util.isGenerator = function (fn) {
  const viaToStr = toStr.call(fn)
  const viaFnToStr = fnToStr.call(fn)
  return (viaToStr === '[object Function]' || viaToStr === '[object GeneratorFunction]') && isFnRegex.test(viaFnToStr)
}

/**
 * Wraps a generator to a callable function
 * @param  {Function} fn
 *
 * @return {Function}
 */
util.wrapGenerator = function (fn) {
  return co.wrap(function * () {
    return yield fn.apply(this, arguments)
  })
}

/**
 * Tells where a function is a ES2015 class or not.
 * @param  {Function} fn
 *
 * @return {Boolean}
 */
util.isClass = function (fn) {
  return typeof fn === 'function' && /^class\s/.test(Function.prototype.toString.call(fn))
}

/**
 * Generates event name from the method name
 * @param  {String} fn
 *
 * @return {String}
 */
util.generateEventName = function (fn) {
  let matchesCount = 0
  return fn.replace(/^on/, '').replace(/([A-Z])/g, function (group, match) {
    matchesCount++
    return matchesCount > 1 ? `:${match.toLowerCase()}` : match.toLowerCase()
  })
}

util.composeMiddleware = function (middlewareList, socket, request) {
  function * noop () {}

  return function * (next) {
    next = next || noop()
    _.forEachRight(middlewareList, (middleware) => {
      next = middleware(socket, request, next)
    })
    yield * next
  }
}
