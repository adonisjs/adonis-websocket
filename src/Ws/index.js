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
    this.redisClient = null
    this.Request = Request
    this._configureAdapter()
  }

  _configureAdapter () {
    if (this.config.adapter && this.config.adapter === 'redis' && this.io) {
      this.redisClient = require('socket.io-redis')(this.config.redis)
      this.redisClient.pubClient.on('error', console.log)
      this.redisClient.subClient.on('error', console.log)
      this.io.adapter(this.redisClient)
    }
  }

  channel (name, closure) {
    return new Channel(this.io, this.Request, name, closure)
  }

  attach (server) {
    this.io = socketio(server)
    this._configureAdapter()
  }

}

module.exports = Ws
