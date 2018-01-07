'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const chai = require('chai')
const assert = chai.assert
const http = require('http')
const { resolver, ioc: Ioc } = require('@adonisjs/fold')
const wsClient = require('socket.io-client')
const Ws = require('../../src/Ws')
const Channel = require('../../src/Channel')
const Context = require('../../src/Context')

class Session {}
class Request {}
class Auth {}

Context.getter('request', function () {
  return new Request()
}, true)

Context.getter('session', function () {
  return new Session()
}, true)

Context.getter('auth', function () {
  return new Auth()
}, true)

const socketUrl = 'http://127.0.0.1:5000'
const options = {
  transports: ['websocket'],
  'force new connection': true
}

const Config = {
  get: function (key, defaultValue) {
    return defaultValue
  }
}

const Server = {
  server: null,
  listen: function (port) {
    this.server = http.createServer(function () {})
    this.server.listen(port)
    return this.server
  },
  getInstance: function () {
    return this.server
  }
}

describe('Ws', function () {
  it('should be able to create a new channel using channel method', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Context, Server)
    const channel = ws.channel('/', function () {})
    assert.instanceOf(channel, Channel)
    Server.getInstance().close()
  })

  it('should return the same channel instance when channel is called serveral times', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Context, Server)
    const channel = ws.channel('/', function () {})
    const channel1 = ws.channel('/', function () {})
    assert.instanceOf(channel, Channel)
    assert.instanceOf(channel1, Channel)
    assert.deepEqual(channel, channel1)
    Server.getInstance().close()
  })

  it('should return the channel instance when closure is not passed to the channel method', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Context, Server)
    ws.channel('/', function () {})
    const channel = ws.channel('/')
    assert.instanceOf(channel, Channel)
    Server.getInstance().close()
  })

  it('should throw exception when trying to get undefined channel', function () {
    const ws = new Ws(Config, Context, Server)
    const channel = () => ws.channel('/')
    assert.throw(channel, 'RuntimeException: E_UNINITIALIZED_METHOD: Trying to access uninitialized channel /')
  })

  it('should be able to bind a custom http server', function () {
    const ws = new Ws({
      get: function () {
        return {
          useHttpServer: false
        }
      }
    }, Context, Server)
    assert.equal(ws.io, null)
    const server = http.createServer(function () {})
    ws.attach(server)
    assert.isObject(ws.io.nsps)
  })

  it('should return the ioc binding when channel closure is a string', function (done) {
    Server.listen(5000)
    resolver.directories({
      wsControllers: 'Controllers/Ws'
    })
    resolver.appNamespace('App')
    Ioc.bind('App/Controllers/Ws/ChannelController', function () {
      class ChannelController {
        constructor ({ socket }) {
          client.disconnect()
          Server.getInstance().close(done)
        }
      }
      return ChannelController
    })
    const ws = new Ws(Config, Context, Server)
    ws.channel('/', 'ChannelController')
    let client = null
    client = wsClient.connect(socketUrl, options)
  })
})
