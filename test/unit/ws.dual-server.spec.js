'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const { Config } = require('@adonisjs/sink')
const Ws = require('../../src/Ws')
const middleware = require('../../src/Middleware')
const url = require('url')

const helpers = require('../helpers')

test.group('Ws-dual-server', (group) => {
  group.afterEach(() => {
    middleware._middleware.global = []
    middleware._middleware.named = {}

    if (this.ws1) {
      this.ws1.close()
    }

    if (this.ws2) {
      this.ws2.close()
    }

    if (this.httpServer) {
      this.httpServer.close()
    }
  })

  test('the ws path should be exposed on the ws server', (assert, done) => {
    this.ws1 = new Ws(new Config())
    assert.equal(this.ws1.path, '/adonis-ws')

    done()
  })

  test('the ws path should not be editable', (assert, done) => {
    this.ws1 = new Ws(new Config())

    assert.throws(() => {
      this.ws1.path = '/wrong-path'
    }, TypeError)

    done()
  })

  test('start server to accept new connections without internal http server', (assert, done) => {
    this.ws1 = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws1.listen()

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (url.parse(request.url).pathname) {
        this.ws1.handleUpgrade(this.httpServer, request, socket, head)
      } else {
        socket.destroy()
      }
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => done())
  })

  test('bind function to verify handshake without internal http server', (assert, done) => {
    assert.plan(1)
    this.ws1 = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()

    this.ws1.onHandshake(async (info) => {
      assert.equal(info.req.url, '/adonis-ws')
    })

    this.ws1.listen()

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (url.parse(request.url).pathname) {
        this.ws1.handleUpgrade(this.httpServer, request, socket, head)
      } else {
        socket.destroy()
      }
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => done())
  })

  test('cancel handshake when handshake fn returns error without internal http server', (assert, done) => {
    assert.plan(1)
    this.ws1 = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()

    this.ws1.onHandshake(async (info) => {
      throw new Error('Cannot accept')
    })

    this.ws1.listen()

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (url.parse(request.url).pathname) {
        this.ws1.handleUpgrade(this.httpServer, request, socket, head)
      } else {
        socket.destroy()
      }
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('error', (error) => {
      done(() => {
        assert.equal(error.message, 'Unexpected server response: 401')
      })
    })
  })

  test('return error when handshake fn is not a function', (assert) => {
    this.ws1 = new Ws(new Config())
    const fn = () => this.ws1.onHandshake({})
    assert.throw(fn, 'E_INVALID_PARAMETER: Ws.onHandshake accepts a function instead received object')
  })

  test('handshake fn can be sync function without internal http server', (assert, done) => {
    assert.plan(1)
    this.ws1 = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()

    this.ws1.onHandshake((info) => {
      throw new Error('Cannot accept')
    })

    this.ws1.listen()

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (url.parse(request.url).pathname) {
        this.ws1.handleUpgrade(this.httpServer, request, socket, head)
      } else {
        socket.destroy()
      }
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('error', (error) => {
      done(() => {
        assert.equal(error.message, 'Unexpected server response: 401')
      })
    })
  })

  test('remove connection from the set when it closes without internal http server', (assert, done) => {
    assert.plan(1)
    this.ws1 = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws1.listen()

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (url.parse(request.url).pathname) {
        this.ws1.handleUpgrade(this.httpServer, request, socket, head)
      } else {
        socket.destroy()
      }
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => {
      this.ws1._connections.forEach((connection) => {
        connection.close()
      })
      setTimeout(() => {
        assert.equal(this.ws1._connections.size, 0)
        done()
      }, 200)
    })
  })

  test('remove connection from the set when an error occurs in underlying connection without internal http server', (assert, done) => {
    assert.plan(1)
    this.ws1 = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws1.listen()

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (url.parse(request.url).pathname) {
        this.ws1.handleUpgrade(this.httpServer, request, socket, head)
      } else {
        socket.destroy()
      }
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => {
      this.ws1._connections.forEach((connection) => {
        connection.ws._socket.destroy(new Error('self destroyed'))
      })
      setTimeout(() => {
        assert.equal(this.ws1._connections.size, 0)
        done()
      }, 200)
    })
  })

  test('register global middleware', (assert) => {
    this.ws1 = new Ws(new Config())
    this.ws1.registerGlobal(['Adonis/Middleware/AuthInit'])

    assert.deepEqual(middleware._middleware.global, [
      {
        namespace: 'Adonis/Middleware/AuthInit.wsHandle',
        params: []
      }
    ])
  })

  test('register named middleware', (assert) => {
    this.ws1 = new Ws(new Config())
    this.ws1.registerNamed({
      auth: 'Adonis/Middleware/Auth'
    })

    assert.deepEqual(middleware._middleware.named, {
      auth: {
        namespace: 'Adonis/Middleware/Auth.wsHandle',
        params: []
      }
    })
  })
})
