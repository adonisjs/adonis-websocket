'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const socketio = require('socket.io')
const { resolver, ioc } = require('@adonisjs/fold')
const Channel = require('../Channel')
const Middleware = require('../Middleware')
const CE = require('../Exceptions')
const defaultConfig = require('../../examples/config')

class Ws {
  constructor (Config, Context, Server) {
    this.config = Config.get('ws', defaultConfig)
    this.io = null
    if (this.config.useHttpServer) {
      this.attach(Server.getInstance())
    }
    this.Context = Context

    /**
     * Channels pool to store channel instances. This is done
     * to avoid multiple channel instantiation.
     *
     * @type {Object}
     */
    this._channelsPool = {}
  }

  /**
   * Returns a new/existing channel instance for
   * a given namespace.
   *
   * @param {String} name
   * @param {Function|Class} closure
   *
   * @return {Object} channelInstance
   *
   * @throws {Error} when trying to access a non-existing channel
   */
  channel (name, closure) {
    /**
     * If closure is a string. Resolve it as a controller from autoloaded
     * controllers.
     */
    if (typeof (closure) === 'string') {
      closure = ioc.use(resolver.forDir('wsControllers').translate(closure))
    }

    /**
     * Behave as a getter when closure is not defined.
     * Also make sure to throw exception when channel
     * has not been creating previously.
     */
    if (!closure) {
      const channel = this._channelsPool[name]
      if (!channel) {
        throw CE.RuntimeException.uninitializedChannel(name)
      }
      return channel
    }

    this._channelsPool[name] = this._channelsPool[name] || new Channel(this.io, this.Context, name, closure)
    return this._channelsPool[name]
  }

  /**
   * Attach a custom http server. Make sure to call
   * attach before creating channels.
   *
   * @param {Object} server
   */
  attach (server) {
    let option = {}
    if (this.config.useUws) {
      option = { wsEngine: 'uws' }
    }
    this.io = socketio(server, option)
  }

  /**
   * Register global middleware
   *
   * @param {Array} list
   */
  global (list) {
    Middleware.global(list)
  }

  /**
   * Register named middleware
   *
   * @param {Object} set
   */
  named (set) {
    Middleware.named(set)
  }
}

module.exports = Ws
