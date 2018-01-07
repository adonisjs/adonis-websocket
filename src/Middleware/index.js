'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const CoCompose = require('co-compose')
const { resolver } = require('@adonisjs/fold')
const haye = require('haye')
const _ = require('lodash')
const CE = require('../Exceptions')
let store = new CoCompose()

const Middleware = exports = module.exports = {}

/**
 * Returns the middleware store instance
 *
 * @return {Object}
 */
Middleware.getStore = function () {
  return store
}

/**
 * Register global middleware.
 *
 * @param  {Array} middlewareList
 */
Middleware.global = function (middlewareList) {
  store.tag('global').register(middlewareList)
}

/**
 * Return global middleware list
 *
 * @return {Array}
 */
Middleware.getGlobal = function () {
  return store.tag('global').get() || []
}

/**
 * Add named middleware
 *
 * @param  {Object} middlewareSet
 */
Middleware.named = function (middlewareSet) {
  store.tag('named').register([middlewareSet])
}

/**
 * Return named middleware.
 *
 * @return {Object}
 */
Middleware.getNamed = function () {
  return store.tag('named').get() ? store.tag('named').get()[0] : []
}

/**
 * Clear the middleware store by re-initiating the
 * store.
 */
Middleware.clear = function () {
  store = new CoCompose()
}

/**
 * Resolves named middleware and concats them with global middleware.
 * This is the final chain to be composed and executed.
 *
 * @param  {Array} namedList
 *
 * @return {Array}
 */
Middleware.resolve = function (namedList) {
  const namedMiddleware = Middleware.getNamed()
  const globalMiddleware = Middleware.getGlobal()

  return globalMiddleware.concat(_.map(namedList, (item) => {
    if (typeof (item) === 'function') {
      return {namespace: item, isFunction: true}
    }
    const formattedItem = haye.fromPipe(item).toArray()[0]
    if (!namedMiddleware[formattedItem.name]) {
      throw CE.RuntimeException.missingNamedMiddleware(formattedItem.name)
    }
    return {namespace: namedMiddleware[formattedItem.name], args: formattedItem.args}
  }))
}

const getHandler = function (iocNamespace) {
  return typeof (iocNamespace) === 'function' ? iocNamespace : `${iocNamespace}.wsHandle`
}

/**
 * Compose middleware to be executed. Here we have all the custom
 * logic to call the middleware fn.
 *
 * @param  {Array} list
 * @param  {Object} context
 *
 * @return {function}
 */
Middleware.compose = function (list, context) {
  return store
    .runner(list)
    .withParams([context])
    .resolve(function (middleware, context) {
      if (middleware.isFunction) {
        return middleware.namespace.apply(null, context)  // eslint-disable-line
      }
      const iocNamespace = middleware.namespace ? middleware.namespace : middleware
      const args = middleware.args || []
      const handler = getHandler(iocNamespace)
      const handlerInstance = resolver.resolveFunc(handler)
      return handlerInstance.method(...context.concat(args)) // eslint-disable-line
    })
    .compose()
}
