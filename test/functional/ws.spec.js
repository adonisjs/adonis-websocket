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
const { ioc } = require('@adonisjs/fold')
const msgpack = require('msgpack-lite')
const msp = require('@adonisjs/websocket-packet')

const setup = require('./setup')
const helpers = require('../helpers')
const Socket = require('../../src/Socket')

test.group('Ws', (group) => {
  group.before(async () => {
    await setup()
  })

  group.beforeEach(() => {
    this.Ws = ioc.use('Ws')
    this.Ws._options.serverInterval = 1000
    this.Ws._options.serverAttempts = 1
    this.httpServer = helpers.startHttpServer()
    this.Ws.listen(this.httpServer)
  })

  group.afterEach(() => {
    this.httpServer.close()
    this.Ws.close()
  })

  test('make a socket connection', (assert, done) => {
    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => {
      done()
    })
  })

  test('send open packet when client joins', (assert, done) => {
    const client = helpers.startClient({}, '/adonis-ws')
    client.on('message', (payload) => {
      done(() => {
        const actualPacket = msgpack.decode(payload)

        assert.deepEqual(actualPacket, {
          t: msp.codes.OPEN,
          d: {
            connId: actualPacket.d.connId,
            serverInterval: this.Ws._options.serverInterval,
            serverAttempts: this.Ws._options.serverAttempts,
            clientInterval: this.Ws._options.clientInterval,
            clientAttempts: this.Ws._options.clientAttempts
          }
        })
      })
    })
  })

  test('return error when trying to join un-registered channel', (assert, done) => {
    const client = helpers.startClient({}, '/adonis-ws')

    client.on('message', (payload) => {
      const actualPacket = msgpack.decode(payload)

      if (actualPacket.t === msp.codes.JOIN_ERROR) {
        done(() => {
          const expectedPacket = msp.joinErrorPacket('chat', 'Topic cannot be handled by any channel')
          assert.deepEqual(actualPacket, expectedPacket)
        })
      }
    })

    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat')))
    })
  })

  test('return error when topic is missing in join packet', (assert, done) => {
    const client = helpers.startClient({}, '/adonis-ws')

    client.on('message', (payload) => {
      const actualPacket = msgpack.decode(payload)

      if (actualPacket.t === msp.codes.JOIN_ERROR) {
        done(() => {
          const expectedPacket = msp.joinErrorPacket('unknown', 'Missing topic name')
          assert.deepEqual(actualPacket, expectedPacket)
        })
      }
    })

    client.on('open', () => {
      client.send(msgpack.encode({ t: msp.codes.JOIN, d: {} }))
    })
  })

  test('join topic when channel is registered to handle it', (assert, done) => {
    const client = helpers.startClient({}, '/adonis-ws')
    let connectedSocket = null

    this.Ws.channel('chat', ({ socket }) => {
      connectedSocket = socket
    })

    client.on('message', (payload) => {
      const actualPacket = msgpack.decode(payload)

      if (actualPacket.t === msp.codes.JOIN_ACK) {
        done(() => {
          const expectedPacket = msp.joinAckPacket('chat')
          assert.deepEqual(actualPacket, expectedPacket)
          assert.instanceOf(connectedSocket, Socket)
        })
      }
    })

    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat')))
    })
  })

  test('return error when joining the same topic twice on a single connection', (assert, done) => {
    const client = helpers.startClient({}, '/adonis-ws')
    let connectedSocket = null

    this.Ws.channel('chat', ({ socket }) => {
      connectedSocket = socket
    })

    client.on('message', (payload) => {
      const actualPacket = msgpack.decode(payload)
      if (actualPacket.t === msp.codes.JOIN_ERROR) {
        done(() => {
          const expectedPacket = msp.joinErrorPacket('chat', 'Cannot join the same topic twice')
          assert.deepEqual(actualPacket, expectedPacket)
          assert.instanceOf(connectedSocket, Socket)
        })
      }
    })

    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat')))
      client.send(msgpack.encode(msp.joinPacket('chat')))
    })
  })

  test('join the same topic twice on different single connections', (assert, done) => {
    let connectedSockets = []
    let replyPackets = []

    this.Ws.channel('chat', ({ socket }) => {
      connectedSockets.push(socket)
    })

    const handleMessage = function (payload) {
      const packet = msgpack.decode(payload)
      if (packet.t === msp.codes.OPEN) {
        return
      }

      replyPackets.push(packet)
      if (replyPackets.length === 2) {
        done(() => {
          const expectedPacket = msp.joinAckPacket('chat')
          assert.deepEqual(replyPackets[0], expectedPacket)
          assert.deepEqual(replyPackets[1], expectedPacket)
          assert.instanceOf(connectedSockets[0], Socket)
          assert.instanceOf(connectedSockets[1], Socket)
        })
      }
    }

    const client = helpers.startClient({}, '/adonis-ws')
    const client1 = helpers.startClient({}, '/adonis-ws')
    client.on('message', handleMessage)
    client1.on('message', handleMessage)

    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat')))
    })

    client1.on('open', () => {
      client1.send(msgpack.encode(msp.joinPacket('chat')))
    })
  })

  test('cleanup all listeners and subscriptions when connection closes', (assert, done) => {
    let connectedSockets = {}
    let replyPackets = {}

    this.Ws.channel('chat:*', ({ socket }) => {
      connectedSockets[socket.topic] = socket
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('message', (payload) => {
      const packet = msgpack.decode(payload)
      if (packet.t === msp.codes.OPEN) {
        return
      }

      replyPackets[packet.d.topic] = packet
      if (Object.keys(replyPackets).length === 2) {
        client.close()
      }
    })

    client.on('close', () => {
      setTimeout(() => {
        done(() => {
          assert.equal(this.Ws._connections.size, 0)
          assert.deepEqual(connectedSockets['chat:watercooler'].connection, connectedSockets['chat:frontend'].connection)
          assert.equal(connectedSockets['chat:watercooler'].connection._subscriptions.size, 0)
          assert.equal(connectedSockets['chat:watercooler'].connection.listenerCount(), 0)
          assert.equal(connectedSockets['chat:watercooler'].emitter.listenerCount(), 0)
          assert.equal(connectedSockets['chat:frontend'].emitter.listenerCount(), 0)
          assert.deepEqual(replyPackets, {
            'chat:watercooler': msp.joinAckPacket('chat:watercooler'),
            'chat:frontend': msp.joinAckPacket('chat:frontend')
          })
        })
      }, 500)
    })

    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat:watercooler')))
      client.send(msgpack.encode(msp.joinPacket('chat:frontend')))
    })
  })

  test('cleanup connection when client doesn\'t ping within pingInterval', (assert, done) => {
    let connectedSockets = {}
    let replyPackets = {}

    this.Ws.channel('chat:*', ({ socket }) => {
      connectedSockets[socket.topic] = socket
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('message', (payload) => {
      const packet = msgpack.decode(payload)
      if (packet.t === msp.codes.OPEN) {
        return
      }
      replyPackets[packet.d.topic] = packet
    })

    client.on('close', () => {
      setTimeout(() => {
        done(() => {
          assert.equal(this.Ws._connections.size, 0)
          assert.deepEqual(connectedSockets['chat:watercooler'].connection, connectedSockets['chat:frontend'].connection)
          assert.equal(connectedSockets['chat:watercooler'].connection._subscriptions.size, 0)
          assert.equal(connectedSockets['chat:watercooler'].connection.listenerCount(), 0)
          assert.equal(connectedSockets['chat:watercooler'].emitter.listenerCount(), 0)
          assert.equal(connectedSockets['chat:frontend'].emitter.listenerCount(), 0)
          assert.deepEqual(replyPackets, {
            'chat:watercooler': msp.joinAckPacket('chat:watercooler'),
            'chat:frontend': msp.joinAckPacket('chat:frontend')
          })
        })
      }, 500)
    })

    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat:watercooler')))
      client.send(msgpack.encode(msp.joinPacket('chat:frontend')))
    })
  }).timeout(5000)

  test('should have access to request object on context', (assert, done) => {
    this.Ws.channel('chat', ({ request }) => {
      assert.instanceOf(request, require('@adonisjs/framework/src/Request'))
      done()
    })

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => {
      client.send(msgpack.encode(msp.joinPacket('chat')))
    })
  })

  test('broadcast messages to multiple clients', (assert, done) => {
    let connectedClients = []
    let receivedMessages = []

    this.Ws.channel('chat', ({ socket }) => {
      connectedClients.push(socket)
      if (connectedClients.length === 3) {
        connectedClients[0].broadcast('greeting', { hello: 'world' })
      }
    })

    function joinChannel (client) {
      client.send(msgpack.encode(msp.joinPacket('chat')))
    }

    function onMessage (payload) {
      const packet = msgpack.decode(payload)
      if (packet.t === msp.codes.EVENT) {
        receivedMessages.push(packet.d)
      }

      if (receivedMessages.length === 2) {
        done(() => {
          assert.deepEqual(receivedMessages, [
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat'
            },
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat'
            }
          ])
        })
      }
    }

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => joinChannel(client))

    const client1 = helpers.startClient({}, '/adonis-ws')
    client1.on('open', () => joinChannel(client1))
    client1.on('message', onMessage)

    const client2 = helpers.startClient({}, '/adonis-ws')
    client2.on('open', () => joinChannel(client2))
    client2.on('message', onMessage)
  })

  test('broadcast messages to all clients', (assert, done) => {
    let connectedClients = []
    let receivedMessages = []

    this.Ws.channel('chat', ({ socket }) => {
      connectedClients.push(socket)
      if (connectedClients.length === 3) {
        connectedClients[0].broadcastToAll('greeting', { hello: 'world' })
      }
    })

    function joinChannel (client) {
      client.send(msgpack.encode(msp.joinPacket('chat')))
    }

    function onMessage (payload) {
      const packet = msgpack.decode(payload)
      if (packet.t === msp.codes.EVENT) {
        receivedMessages.push(packet.d)
      }

      if (receivedMessages.length === 3) {
        done(() => {
          assert.deepEqual(receivedMessages, [
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat'
            },
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat'
            },
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat'
            }
          ])
        })
      }
    }

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => joinChannel(client))
    client.on('message', onMessage)

    const client1 = helpers.startClient({}, '/adonis-ws')
    client1.on('open', () => joinChannel(client1))
    client1.on('message', onMessage)

    const client2 = helpers.startClient({}, '/adonis-ws')
    client2.on('open', () => joinChannel(client2))
    client2.on('message', onMessage)
  })

  test('only broadcast within the same channel', (assert, done) => {
    let connectedClients = {
      'chat:watercooler': [],
      'chat:frontend': []
    }
    let receivedMessages = []

    this.Ws.channel('chat:*', ({ socket }) => {
      connectedClients[socket.topic].push(socket)

      if (connectedClients['chat:watercooler'].length === 2 && connectedClients['chat:frontend'].length === 1) {
        connectedClients['chat:watercooler'][0].broadcastToAll('greeting', { hello: 'world' })
      }
    })

    function joinChannel (client, topic) {
      client.send(msgpack.encode(msp.joinPacket(topic)))
    }

    function onMessage (payload) {
      const packet = msgpack.decode(payload)
      if (packet.t === msp.codes.EVENT) {
        receivedMessages.push(packet.d)
      }

      if (receivedMessages.length === 2) {
        done(() => {
          assert.deepEqual(receivedMessages, [
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat:watercooler'
            },
            {
              body: { event: 'greeting', data: { hello: 'world' } },
              topic: 'chat:watercooler'
            }
          ])
        })
      }
    }

    const client = helpers.startClient({}, '/adonis-ws')
    client.on('open', () => joinChannel(client, 'chat:watercooler'))
    client.on('message', onMessage)

    const client1 = helpers.startClient({}, '/adonis-ws')
    client1.on('open', () => joinChannel(client1, 'chat:watercooler'))
    client1.on('message', onMessage)

    const client2 = helpers.startClient({}, '/adonis-ws')
    client2.on('open', () => joinChannel(client2, 'chat:frontend'))
    client2.on('message', onMessage)
  })
})
