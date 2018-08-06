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

const helpers = require('../helpers')

test.group('Ws', (group) => {
  group.afterEach(() => {
    middleware._middleware.global = []
    middleware._middleware.named = {}

    if (this.ws) {
      this.ws.close()
    }

    if (this.httpServer) {
      this.httpServer.close()
    }
  })

  test('start server to accept new connections', (assert, done) => {
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => done())
  })

  test('bind function to verify handshake', (assert, done) => {
    assert.plan(1)
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()

    this.ws.onHandshake(async (info) => {
      assert.equal(info.req.url, '/adonis-ws')
    })

    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => done())
  })

  test('cancel handshake when handshake fn returns error', (assert, done) => {
    assert.plan(1)
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()

    this.ws.onHandshake(async (info) => {
      throw new Error('Cannot accept')
    })

    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('error', (error) => {
      done(() => {
        assert.equal(error.message, 'Unexpected server response: 401')
      })
    })
  })

  test('return error when handshake fn is not a function', (assert) => {
    this.ws = new Ws(new Config())
    const fn = () => this.ws.onHandshake({})
    assert.throw(fn, 'E_INVALID_PARAMETER: Ws.onHandshake accepts a function instead received object')
  })

  test('handshake fn can be sync function', (assert, done) => {
    assert.plan(1)
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()

    this.ws.onHandshake((info) => {
      throw new Error('Cannot accept')
    })

    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('error', (error) => {
      done(() => {
        assert.equal(error.message, 'Unexpected server response: 401')
      })
    })
  })

  test('remove connection from the set when it closes', (assert, done) => {
    assert.plan(1)
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => {
      this.ws._connections.forEach((connection) => {
        connection.close()
      })
      setTimeout(() => {
        assert.equal(this.ws._connections.size, 0)
        done()
      }, 200)
    })
  })

  test('remove connection from the set when an error occurs in underlying connection', (assert, done) => {
    assert.plan(1)
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => {
      this.ws._connections.forEach((connection) => {
        connection.ws._socket.destroy(new Error('self destroyed'))
      })
      setTimeout(() => {
        assert.equal(this.ws._connections.size, 0)
        done()
      }, 200)
    })
  })

  test('register global middleware', (assert) => {
    this.ws = new Ws(new Config())
    this.ws.registerGlobal(['Adonis/Middleware/AuthInit'])

    assert.deepEqual(middleware._middleware.global, [
      {
        namespace: 'Adonis/Middleware/AuthInit.wsHandle',
        params: []
      }
    ])
  })

  test('register named middleware', (assert) => {
    this.ws = new Ws(new Config())
    this.ws.registerNamed({
      auth: 'Adonis/Middleware/Auth'
    })

    assert.deepEqual(middleware._middleware.named, {
      auth: {
        namespace: 'Adonis/Middleware/Auth.wsHandle',
        params: []
      }
    })
  })

  test('work fine with slash in the end', (assert, done) => {
    this.ws = new Ws(new Config())
    this.httpServer = helpers.startHttpServer()
    this.ws.listen(this.httpServer)

    const client = helpers.startClient({}, '/adonis-ws/')
    client.on('open', () => done())
  })
})
