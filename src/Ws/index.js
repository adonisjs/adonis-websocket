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
const Ioc = require('adonis-fold').Ioc
const Channel = require('../Channel')
const Middleware = require('../Middleware')
const CE = require('../Exceptions')
const defaultConfig = require('../../examples/config')
const sessionMethodsToDisable = ['put', 'pull', 'flush', 'forget']

class Ws {

  constructor (Config, Request, Server, Session, Helpers) {
    class WsSession extends Session {
    }
    this.config = Config.get('ws', defaultConfig)
    this.io = null
    this.config.useHttpServer ? this.attach(Server.getInstance()) : null
    this.Request = Request
    this.Session = WsSession
    this.Helpers = Helpers
    this.controllersPath = 'Ws/Controllers'

    /**
     * Channels pool to store channel instances. This is done
     * to avoid multiple channel instantiation.
     *
     * @type {Object}
     */
    this._channelsPool = {}

    /**
     * Here we override methods on the session provider extended
     * class to make sure the end user is not mutating the
     * session state, since we do not have access to the
     * response object.
     */
    sessionMethodsToDisable.forEach((method) => {
      this.Session.prototype[method] = function () {
        throw CE.RuntimeException.invalidAction('Cannot mutate session values during websocket request')
      }
    })
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
      closure = Ioc.use(this.Helpers.makeNameSpace(this.controllersPath, closure))
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

    this._channelsPool[name] = this._channelsPool[name] || new Channel(this.io, this.Request, this.Session, name, closure)
    return this._channelsPool[name]
  }

  /**
   * Attach a custom http server. Make sure to call
   * attach before creating channels.
   *
   * @param {Object} server
   */
  attach (server) {
    this.io = socketio(server)
    if (this.config.useUws) {
      this.io.ws = new (require('uws').Server)({
        noServer: true,
        perMessageDeflate: false
      })
    }
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
