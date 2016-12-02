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
const Ws = require('../../src/Ws')
const Channel = require('../../src/Channel')

const Config = {
  get: function (key, defaultValue) {
    return defaultValue
  }
}

const Server = {
  server: null,
  listen: function () {
    this.server = http.createServer(function () {})
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
    const ws = new Ws(Config, Request, Server)
    const channel = ws.channel('/', function () {})
    assert.instanceOf(channel, Channel)
    Server.getInstance().close()
  })

  it('should return the same channel instance when channel is called serveral times', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Request, Server)
    const channel = ws.channel('/', function () {})
    const channel1 = ws.channel('/', function () {})
    assert.instanceOf(channel, Channel)
    assert.instanceOf(channel1, Channel)
    assert.deepEqual(channel, channel1)
    Server.getInstance().close()
  })

  it('should return the channel instance when closure is not passed to the channel method', function () {
    Server.listen(5000)
    const ws = new Ws(Config, Request, Server)
    ws.channel('/', function () {})
    const channel = ws.channel('/')
    assert.instanceOf(channel, Channel)
    Server.getInstance().close()
  })

  it('should throw exception when trying to get undefined channel', function () {
    const ws = new Ws(Config, Request, Server)
    const channel = () => ws.channel('/')
    assert.throw(channel, 'Cannot find / channel')
  })

  it('should be able to bind a custom http server', function () {
    Server.listen(5000)
    const ws = new Ws({
      get: function () {
        return {
          useHttpServer: false
        }
      }
    }, Request, Server)
    assert.equal(ws.io, null)
    const server = http.createServer(function () {})
    ws.attach(server)
    assert.isObject(ws.io.nsps)
    server.close()
  })
})
