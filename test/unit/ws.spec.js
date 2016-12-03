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
const Ioc = require('adonis-fold').Ioc
const wsClient = require('socket.io-client')
const Ws = require('../../src/Ws')
const Channel = require('../../src/Channel')
class Session {}
const Helpers = {
  makeNameSpace (namespace, controller) {
    return `${namespace}/${controller}`
  }
}

const socketUrl = 'http://0.0.0.0:5000'
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

class Request {}

describe('Ws', function () {
  it('should be able to create a new channel using channel method', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Request, Server, Session)
    const channel = ws.channel('/', function () {})
    assert.instanceOf(channel, Channel)
    Server.getInstance().close()
  })

  it('should return the same channel instance when channel is called serveral times', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Request, Server, Session)
    const channel = ws.channel('/', function () {})
    const channel1 = ws.channel('/', function () {})
    assert.instanceOf(channel, Channel)
    assert.instanceOf(channel1, Channel)
    assert.deepEqual(channel, channel1)
    Server.getInstance().close()
  })

  it('should return the channel instance when closure is not passed to the channel method', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Request, Server, Session)
    ws.channel('/', function () {})
    const channel = ws.channel('/')
    assert.instanceOf(channel, Channel)
    Server.getInstance().close()
  })

  it('should throw exception when trying to get undefined channel', function () {
    const ws = new Ws(Config, Request, Server, Session)
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
    }, Request, Server, Session)
    assert.equal(ws.io, null)
    const server = http.createServer(function () {})
    ws.attach(server)
    assert.isObject(ws.io.nsps)
  })

  it('should throw exception when trying to channel one of the restricted methods on request session', function (done) {
    Server.listen(5000)
    const ws = new Ws(Config, Request, Server, Session)
    ws.channel('/', function (socket, request) {
      assert.throw(request.session.put, 'Cannot mutate session values during websocket request')
      client.disconnect()
      Server.getInstance().close(done)
    })
    let client = null
    client = wsClient.connect(socketUrl, options)
  })

  it('should return the ioc binding when channel closure is a string', function (done) {
    Server.listen(5000)
    Ioc.bind('Ws/Controllers/ChannelController', function () {
      class ChannelController {
        constructor () {
          client.disconnect()
          Server.getInstance().close(done)
        }
      }
      return ChannelController
    })
    const ws = new Ws(Config, Request, Server, Session, Helpers)
    ws.channel('/', 'ChannelController')
    let client = null
    client = wsClient.connect(socketUrl, options)
  })
})
