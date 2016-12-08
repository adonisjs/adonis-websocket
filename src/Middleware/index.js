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
const Ioc = require('adonis-fold').Ioc
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

/**
 * Compose middleware to be executed. Here we have all the custom
 * logic to call the middleware fn.
 *
 * @param  {Array} list
 * @param  {Object} socket
 * @param  {Object} request
 *
 * @return {function}
 */
Middleware.compose = function (list, socket, request) {
  return store
    .withParams(socket, request)
    .resolve(function (middleware, params) {
      if (middleware.isFunction) {
        return middleware.namespace.apply(null, params)
      }
      const iocNamespace = middleware.namespace ? middleware.namespace : middleware
      const args = middleware.args || []
      const middlewareInstance = Ioc.make(iocNamespace)
      return middlewareInstance.handleWs.apply(middlewareInstance, params.concat(args))
    })
    .compose(list)
}
