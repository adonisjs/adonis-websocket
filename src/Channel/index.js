'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')
const Middleware = require('co-compose')

/**
 * Channel class gives a simple way to divide the application
 * level concerns by maintaing a single TCP connection.
 *
 * @class Channel
 *
 * @param {String} name         Unique channel name
 * @param {Function} onConnect  Function to be invoked when a socket joins a Channel
 */
class Channel {
  constructor (name, onConnect) {
    this._validateArguments(name, onConnect)
    this.name = name
    this._onConnect = onConnect

    /**
     * All of the channel subscriptions are grouped
     * together as per their topics.
     *
     * @example
     * this.subscriptions.set('chat:watercooler', new Set())
     * this.subscriptions.set('chat:general', new Set())
     *
     * @type {Map}
     */
    this.subscriptions = new Map()

    /**
     * Middleware to be executed when someone attempts to join
     * a topic
     */
    this._middleware = new Middleware()

    /**
     * The method attached as an event listener to each
     * subscription.
     */
    this.deleteSubscription = function (subscription) {
      const topic = this.subscriptions.get(subscription.topic)
      if (topic) {
        topic.delete(subscription)
      }
    }.bind(this)
  }

  /**
   * Validate the new instance arguments to make sure we
   * can instantiate the channel.
   *
   * @method _validateArguments
   *
   * @param  {String}           name
   * @param  {Function}           onConnect
   *
   * @return {void}
   *
   * @throws {InvalidArgumentException} If arguments are incorrect
   *
   * @private
   */
  _validateArguments (name, onConnect) {
    if (typeof (name) !== 'string' || !name) {
      throw GE.InvalidArgumentException.invalidParameter('Expected channel name to be string')
    }

    if (typeof (onConnect) !== 'function') {
      throw GE.InvalidArgumentException.invalidParameter('Expected channel callback to be a function')
    }
  }

  /**
   * Executes the middleware stack
   *
   * @method _executeMiddleware
   *
   * @param  {Object}           context
   *
   * @return {Promise}
   *
   * @private
   */
  _executeMiddleware (context) {
    if (!this._middleware.list.length) {
      return Promise.resolve()
    }
    return this._middleware.runner().params([context]).run()
  }

  /**
   * Returns the subscriptions set for a given topic. If there are no
   * subscriptions, an empty set will be initialized and returned.
   *
   * @method getTopicSubscriptions
   *
   * @param  {String}              name
   *
   * @return {Set}
   */
  getTopicSubscriptions (topic) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set())
    }
    return this.subscriptions.get(topic)
  }

  /**
   * Join a topic by saving the subscription reference. This method
   * will execute the middleware chain before saving the
   * subscription reference and invoking the onConnect
   * callback.
   *
   * @method joinTopic
   *
   * @param  {Context}  context
   *
   * @return {void}
   */
  async joinTopic (context) {
    await this._executeMiddleware(context)
    const subscriptions = this.getTopicSubscriptions(context.socket.topic)

    /**
     * Add new subscription to existing subscriptions
     */
    subscriptions.add(context.socket)

    /**
     * Add reference of channel to the subscription
     */
    context.socket.associateChannel(this)

    /**
     * Binding to close event, so that we can clear the
     * subscription object from the subscriptions
     * set.
     */
    context.socket.on('close', this.deleteSubscription)

    /**
     * Calling onConnect in the next tick, so that the parent
     * connection saves a reference to it, before the closure
     * is executed.
     */
    process.nextTick(() => (this._onConnect(context)))
  }

  /**
   * Add middleware to the channel. It will be called everytime a
   * subscription joins a topic
   *
   * @method middleware
   *
   * @param  {Function|Function[]}   middleware
   *
   * @chainable
   */
  middleware (middleware) {
    const middlewareList = Array.isArray(middleware) ? middleware : [middleware]
    this._middleware.register(middlewareList)
    return this
  }

  /**
   * Broadcast event message to a given topic.
   *
   * @method broadcast
   *
   * @param  {String}  topic
   * @param  {String}  payload
   * @param  {Array}   filterSockets
   *
   * @return {void}
   */
  broadcast (topic, payload, filterSockets = []) {
    this.subscriptions.get(topic).forEach((socket) => {
      if (filterSockets.indexOf(socket.id) === -1) {
        socket.connection.write(payload)
      }
    })
  }

  /**
   * Invoked when a message is received on cluster node
   *
   * @method clusterBroadcast
   *
   * @param  {String}         topic
   * @param  {String}         payload
   *
   * @return {void}
   */
  clusterBroadcast (topic, payload) {
    this.broadcast(topic, payload, [])
  }
}

module.exports = Channel
