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
const msp = require('@adonisjs/websocket-packet')

const Connection = require('../../src/Connection')
const Manager = require('../../src/Channel/Manager')
const JsonEncoder = require('../../src/JsonEncoder')

const helpers = require('../helpers')

test.group('Connection', (group) => {
  group.afterEach(async () => {
    await new Promise((resolve) => {
      Manager.clear()

      if (this.ws) {
        this.ws.close(() => {
          this.ws.options.server.close(resolve)
        })
      }
    })
  })

  test('bind all relevant events on new instance', (assert, done) => {
    assert.plan(4)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      assert.equal(connection.ws._eventsCount, 3)
      assert.property(connection.ws._events, 'message')
      assert.property(connection.ws._events, 'error')
      assert.property(connection.ws._events, 'close')
      done()
    })
    helpers.startClient()
  })

  test('on connection send open packet', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection.sendOpenPacket()
    })

    const client = helpers.startClient()
    client.on('message', function (payload) {
      assert.isTrue(msp.isOpenPacket(JSON.parse(payload)))
      done()
    })
  })

  test('send error when channel join packet is missing topic', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    const client = helpers.startClient()
    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      done(() => {
        assert.deepEqual(packet, { t: msp.codes.JOIN_ERROR, d: { topic: 'unknown', message: 'Missing topic name' } })
      })
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN }))
    })
  })

  test('send error when no matching channel found for a topic', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    const client = helpers.startClient()
    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      done(() => {
        assert.deepEqual(packet, {
          t: msp.codes.JOIN_ERROR,
          d: { topic: 'chat', message: 'Topic cannot be handled by any channel' }
        })
      })
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('send JOIN_ACK when able to subscribe to a topic', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function () {})

    const client = helpers.startClient()
    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      done(() => {
        assert.deepEqual(packet, { t: msp.codes.JOIN_ACK, d: { topic: 'chat' } })
      })
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('save socket reference when joinTopic succeeds', (assert, done) => {
    assert.plan(3)
    let connection = null
    let connectedSocket = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function ({ socket }) {
      connectedSocket = socket
    })

    const client = helpers.startClient()

    client.on('message', function () {
      done(() => {
        assert.equal(Manager.channels.get('chat').subscriptions.size, 1)
        assert.deepEqual(Manager.channels.get('chat').subscriptions.get('chat'), new Set([connectedSocket]))
        assert.deepEqual(connection._subscriptions.get('chat'), connectedSocket)
      })
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('joining same topic twice should result in error', (assert, done) => {
    assert.plan(1)
    let joinCallbackTriggerCount = 0

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function () {
      joinCallbackTriggerCount++
      if (joinCallbackTriggerCount > 1) {
        done(new Error('Was not expecting this to be called'))
      }
    })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      if (packet.t === msp.codes.JOIN_ERROR) {
        done(() => {
          assert.deepEqual(packet, {
            t: msp.codes.JOIN_ERROR,
            d: { topic: 'chat', message: 'Cannot join the same topic twice' }
          })
        })
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('handle join topic calls in correct sequence', (assert, done) => {
    assert.plan(2)

    const responsePackets = []
    let connection = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function () {})

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      responsePackets.push(packet)

      if (responsePackets.length === 4) {
        done(() => {
          assert.deepEqual(responsePackets, [
            { t: msp.codes.JOIN_ERROR, d: { message: 'Missing topic name', topic: 'unknown' } },
            { t: msp.codes.JOIN_ERROR, d: { message: 'Topic cannot be handled by any channel', topic: 'foo' } },
            { t: msp.codes.JOIN_ACK, d: { topic: 'chat' } },
            { t: msp.codes.JOIN_ERROR, d: { message: 'Cannot join the same topic twice', topic: 'chat' } }
          ])
          assert.deepEqual(connection._subscriptionsQueue, [])
        })
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN }))
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'foo' } }))
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('leave topic without topic name should return error', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function () {})

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      done(() => {
        assert.deepEqual(packet, { t: msp.codes.LEAVE_ERROR, d: { topic: 'unknown', message: 'Missing topic name' } })
      })
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.LEAVE }))
    })
  })

  test('ACK leave topic', (assert, done) => {
    assert.plan(1)

    const responsePackets = []

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function () {})

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      responsePackets.push(packet)

      if (responsePackets.length === 2) {
        done(() => {
          assert.deepEqual(responsePackets, [
            { t: msp.codes.JOIN_ACK, d: { topic: 'chat' } },
            { t: msp.codes.LEAVE_ACK, d: { topic: 'chat' } }
          ])
        })
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
      client.send(JSON.stringify({ t: msp.codes.LEAVE, d: { topic: 'chat' } }))
    })
  })

  test('cleanup topic socket from channel and connection on leave', (assert, done) => {
    assert.plan(2)

    let eventsCount = 0
    let connection = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    const channel = Manager.add('chat', function () {})

    const client = helpers.startClient()

    client.on('message', function (payload) {
      eventsCount++
      if (eventsCount === 2) {
        done(() => {
          assert.equal(connection._subscriptions.size, 0)
          assert.equal(channel.subscriptions.get('chat').size, 0)
        })
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
      client.send(JSON.stringify({ t: msp.codes.LEAVE, d: { topic: 'chat' } }))
    })
  })

  test('one connection should not interfere with other connection', (assert, done) => {
    assert.plan(5)

    let eventsCount = 0
    const connections = {}

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connections[req.url] = connection
    })

    const channel = Manager.add('chat', function () {})

    const client = helpers.startClient({ seq: 1 })
    const client1 = helpers.startClient({ seq: 2 })

    const messageHandler = function () {
      eventsCount++
      if (eventsCount === 3) {
        setTimeout(() => {
          done(function () {
            assert.notEqual(connections['/?seq=1'].id, connections['/?seq=2'].id)
            assert.equal(connections['/?seq=1']._subscriptions.size, 0)
            assert.equal(connections['/?seq=2']._subscriptions.size, 1)
            assert.equal(channel.subscriptions.get('chat').size, 1)
            assert.equal(channel.subscriptions.get('chat').values().next().value.id, `chat#${connections['/?seq=2'].id}`)
          })
        })
      }
    }

    client.on('message', messageHandler)
    client1.on('message', messageHandler)

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
      client.send(JSON.stringify({ t: msp.codes.LEAVE, d: { topic: 'chat' } }))
    })

    client1.on('open', function () {
      client1.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('kill all connection subscriptions on close', (assert, done) => {
    assert.plan(2)
    let connection = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    const channel = Manager.add('chat', function () {})
    const client = helpers.startClient()

    client.on('message', function () {
      client.close()
      setTimeout(() => {
        assert.equal(connection._subscriptions.size, 0)
        assert.equal(channel.subscriptions.get('chat').size, 0)
        done()
      }, 1000)
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('emit close on subscription when connection closes', (assert, done) => {
    assert.plan(3)
    let connection = null
    let closedCalled = false

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    const channel = Manager.add('chat', function ({ socket }) {
      socket.on('close', function () {
        closedCalled = true
      })
    })
    const client = helpers.startClient()

    client.on('message', function () {
      client.close()
      setTimeout(() => {
        done(() => {
          assert.equal(connection._subscriptions.size, 0)
          assert.equal(channel.subscriptions.get('chat').size, 0)
          assert.isTrue(closedCalled)
        })
      }, 1000)
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('ignore non existing topic leaves', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      /* eslint no-new: "off" */
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function () {})

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      assert.deepEqual(packet, {
        t: msp.codes.LEAVE_ACK, d: { topic: 'chat' }
      })
      done()
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.LEAVE, d: { topic: 'chat' } }))
    })
  })

  test('discard topic join when channel middleware throws exception', (assert, done) => {
    assert.plan(3)

    let connection = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    const channel = Manager
      .add('chat', function () {})
      .middleware(async () => {
        throw new Error('Unauthorized')
      })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      done(function () {
        assert.deepEqual(packet, {
          t: msp.codes.JOIN_ERROR, d: { topic: 'chat', message: 'Unauthorized' }
        })
        assert.equal(connection._subscriptions.size, 0)
        assert.equal(channel.subscriptions.size, 0)
      })
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('send event from server to client', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function ({ socket }) {
      socket.emit('greeting', 'hello')
    })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      if (packet.t === msp.codes.EVENT) {
        done(function () {
          assert.deepEqual(packet.d, { topic: 'chat', body: { event: 'greeting', data: 'hello' } })
        })
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('pass encoder error to ack method', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const msgpackEncoder = Object.assign({}, JsonEncoder, {
        encode (payload, cb) {
          cb(new Error('Cannot encode'))
        }
      })

      const connection = new Connection(ws, req, msgpackEncoder)
      connection.sendPacket(1, {}, function (error) {
        assert.equal(error.message, 'Cannot encode')
        done()
      })
    })

    helpers.startClient()
  })

  test('pass error to emit ack method when underlying connection is closed', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()

    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection.close()

      connection.sendPacket({ d: 1 }, {}, (error) => {
        setTimeout(() => {
          done(() => {
            assert.equal(error.message, 'connection is closed')
          })
        }, 1000)
      })
    })

    helpers.startClient()
  })

  test('return hard error when sending message without a topic', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()

    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      const fn = () => connection.sendEvent()
      done(() => {
        assert.throw(fn, 'Cannot send event without a topic')
      })
    })

    helpers.startClient()
  })

  test('return hard error when topic has no active subscriptions on a connection', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()

    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      const fn = () => connection.sendEvent('chat')
      done(() => {
        assert.throw(fn, 'Topic chat doesn\'t have any active subscriptions')
      })
    })

    helpers.startClient()
  })

  test('drop packet when client doesn\'t define the packet type', (assert, done) => {
    this.ws = helpers.startWsServer()

    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection._handleMessage = function () {
        throw new Error('Never expected to be executed')
      }
    })

    const client = helpers.startClient()
    client.on('open', () => {
      client.send(JSON.stringify({ hello: 'world' }))
      setTimeout(() => {
        done()
      })
    })
  })

  test('drop packet when unable to decode packet', (assert, done) => {
    this.ws = helpers.startWsServer()

    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection._handleMessage = function () {
        throw new Error('Never expected to be executed')
      }
    })

    const client = helpers.startClient()
    client.on('open', () => {
      client.send('hello')
      setTimeout(() => {
        done()
      })
    })
  })

  test('remove subscription reference from connection when subscription closes from server', (assert, done) => {
    assert.plan(2)
    let connection = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
    })

    const channel = Manager.add('chat', function ({ socket }) {
      socket.close()
    })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      if (packet.t === msp.codes.LEAVE) {
        setTimeout(() => {
          assert.equal(connection._subscriptions.size, 0)
          assert.equal(channel.subscriptions.get('chat').size, 0)
          done()
        }, 1000)
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('pass client message to the subscription instance', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function ({ socket }) {
      socket.on('greeting', (greeting) => {
        done(() => {
          assert.equal(greeting, 'hello')
        })
      })
    })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      if (packet.t === msp.codes.JOIN_ACK) {
        client.send(JSON.stringify({ t: msp.codes.EVENT, d: { topic: 'chat', event: 'greeting', data: 'hello' } }))
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('drop event packet when there is no data', (assert, done) => {
    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      new Connection(ws, req, JsonEncoder)
    })

    Manager.add('chat', function ({ socket }) {
      socket.on('greeting', (greeting) => {
        throw new Error('Never expected to be called')
      })
    })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      const packet = JSON.parse(payload)
      if (packet.t === msp.codes.JOIN_ACK) {
        client.send(JSON.stringify({ t: msp.codes.EVENT }))
        setTimeout(() => {
          done()
        }, 500)
      }
    })

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('drop event packet when there are no subscriptions for the topic', (assert, done) => {
    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      new Connection(ws, req, JsonEncoder)
    })

    const client = helpers.startClient()

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.EVENT, d: { topic: 'chat', event: 'greeting', data: 'hello' } }))
      setTimeout(() => {
        done()
      }, 500)
    })
  })

  test('reset pingElapsed on each message frame', (assert, done) => {
    let connection = null

    this.ws = helpers.startWsServer()

    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
      connection.pingElapsed = 1
    })

    const client = helpers.startClient()

    client.on('open', function () {
      client.send(JSON.stringify({ t: msp.codes.EVENT, d: { topic: 'chat', event: 'greeting', data: 'hello' } }))
      setTimeout(() => {
        done(() => {
          assert.equal(connection.pingElapsed, 0)
        })
      }, 200)
    })
  })

  test('remove subscription when error occurs in connection', (assert, done) => {
    assert.plan(2)

    let connection = null

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      connection = new Connection(ws, req, JsonEncoder)
      connection.pingElapsed = 1
    })

    Manager.add('chat', function () {
      connection.ws._socket.destroy(new Error('self destroyed'))
      assert.equal(connection._subscriptions.size, 1)
    })

    const client = helpers.startClient()

    client.on('close', () => {
      assert.equal(connection._subscriptions.size, 0)
      done()
    })

    client.on('open', () => {
      client.send(JSON.stringify({ t: msp.codes.JOIN, d: { topic: 'chat' } }))
    })
  })

  test('on ping send pong', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      new Connection(ws, req, JsonEncoder)
    })

    const client = helpers.startClient()

    client.on('message', (payload) => {
      assert.deepEqual(JSON.parse(payload), { t: msp.codes.PONG })
      done()
    })

    client.on('open', () => {
      client.send(JSON.stringify({ t: msp.codes.PING }))
    })
  })

  test('write payload to the socket', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection.write('hello world')
    })

    const client = helpers.startClient()

    client.on('message', function (payload) {
      assert.equal(payload, 'hello world')
      done()
    })
  })

  test('return error when trying to write but connection is closed', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection.close()
      setTimeout(() => {
        connection.write('hello world', {}, ({ message }) => {
          assert.equal(message, 'connection is closed')
          done()
        })
      })
    })

    const client = helpers.startClient()
    client.on('message', function (payload) {
      assert.throw('Not expecting to the called')
    })
  })

  test('drop invalid packets', (assert, done) => {
    assert.plan(1)

    this.ws = helpers.startWsServer()
    this.ws.on('connection', (ws, req) => {
      const connection = new Connection(ws, req, JsonEncoder)
      connection._notifyPacketDropped = function (handle, message) {
        assert.equal(message, 'invalid packet %j')
        done()
      }
    })

    const client = helpers.startClient()
    client.on('open', function (payload) {
      client.send(JSON.stringify({ t: 99 }))
    })
  })
})
