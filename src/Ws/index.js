'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Channel = require('../Channel')
const socketio = require('socket.io')
const defaultConfig = require('../../examples/config')

class Ws {

  constructor (Config, Request, Server) {
    this.config = Config.get('ws', defaultConfig)
    this.io = this.config.useHttpServer ? socketio(Server.getInstance()) : null
    this._channelsPool = {}
    this.Request = Request
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
     * Behave as a getter when closure is not defined.
     * Also make sure to throw exception when channel
     * has not been creating previously.
     */
    if (!closure) {
      const channel = this._channelsPool[name]
      if (!channel) {
        throw new Error(`Cannot find ${name} channel`)
      }
      return channel
    }

    this._channelsPool[name] = this._channelsPool[name] || new Channel(this.io, this.Request, name, closure)
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
  }

}

module.exports = Ws
