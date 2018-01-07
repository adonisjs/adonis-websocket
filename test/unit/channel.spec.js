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
const wsClient = require('socket.io-client')
const socketio = require('socket.io')
const assert = chai.assert
const http = require('http')
const Channel = require('../../src/Channel')
const Presence = require('../../src/Presence')
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

describe('Channel', function () {
  it('should invoke the closure when a client connects', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    /* eslint no-new: "off" */
    new Channel(io, Context, '/', function () {
      server.close(done)
      client.disconnect()
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
  })

  it('should have access to a given socket upon connection', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/', function (context) {
      assert.equal(context.socket.socket.connected, true)
      assert.equal(context.socket.socket.nsp.name, '/')
      server.close(done)
      client.disconnect()
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
  })

  it('should throw exception when disconnected is not a function', function () {
    const server = http.createServer(function () {})
    const io = socketio(server)
    try {
      const channel = new Channel(io, Context, '/', function () {}).disconnected()
      assert.equal(channel, undefined)
    } catch (e) {
      assert.equal(e.message, 'E_INVALID_PARAMETER: Make sure to pass a function for disconnected event')
    }
  })

  it('should call the disconnect callback when client disconnects', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/', function () {})
    .disconnected(function (context) {
      server.close(done)
    })

    server.listen(5000)

    let client = null

    client = wsClient.connect(socketUrl, options)
    client.disconnect()
  })

  it('should call the disconnect generator method when client disconnects', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/', function () {})
    .disconnected(function ({ socket }) {
      server.close(done)
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.disconnect()
  })

  it('should be able to listen for events', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/', function ({ socket }) {
      socket.on('greet', (username) => {
        assert.equal(username, 'virk')
        server.close(done)
        client.disconnect()
      })
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.emit('greet', 'virk')
  })

  it('should be able to attach a class to the channel', function (done) {
    const server = http.createServer(function () {})

    class ChannelController {
      constructor () {
        server.close(done)
        client.disconnect()
      }
    }

    const io = socketio(server)
    new Channel(io, Context, '/', ChannelController)

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
  })

  it('should pass socket reference to the class instance', function (done) {
    const server = http.createServer(function () {})

    class ChannelController {
      constructor ({ socket }) {
        assert.equal(socket.socket.connected, true)
        server.close(done)
        client.disconnect()
      }
    }

    const io = socketio(server)
    new Channel(io, Context, '/', ChannelController)

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
  })

  it('should create isolated channel controller instance for each client', function (done) {
    const server = http.createServer(function () {})

    class ChannelController {
      constructor ({ socket }) {
        this.socket = socket
        contollerInstances.push(this)
        if (contollerInstances.length === 2) {
          assert.notEqual(contollerInstances[0].socket.socket.id, contollerInstances[1].socket.socket.id)
          assert.notDeepEqual(contollerInstances[0], contollerInstances[1])
          server.close(done)
          client.disconnect()
          client1.disconnect()
        }
      }
    }

    const io = socketio(server)
    new Channel(io, Context, '/', ChannelController)

    server.listen(5000)

    const contollerInstances = []
    let client = null
    let client1 = null
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
  })

  it('should be able to emit messages', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/', function ({ socket }) {
      socket.toEveryone().emit('greet', 'virk')
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('greet', function (name) {
      assert.equal(name, 'virk')
      server.close(done)
      client.disconnect()
    })
  })

  it('should be able to emit messages to everyone inside a namespace', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/chat', function ({ socket }) {
      socket.toEveryone().emit('greet', 'virk')
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(`${socketUrl}/chat`, options)
    client.on('greet', function (name) {
      assert.equal(name, 'virk')
      server.close(done)
      client.disconnect()
    })
  })

  it('should be able to emit messages to all the connected clients', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    new Channel(io, Context, '/', function ({ socket }) {
      socket.on('fire', function () {
        socket.toEveryone().emit('greet', 'virk')
      })
    })

    server.listen(5000)

    const handler = function (name) {
      eventsCount++
      assert.equal(name, 'virk')
      if (eventsCount === 2) {
        server.close(done)
        client.disconnect()
        client1.disconnect()
      }
    }

    let eventsCount = 0
    let client = null
    let client1 = null
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
    client.on('greet', handler)
    client1.on('greet', handler)
    client.emit('fire')
  })

  it('should be able to emit messages to everyone but not to itself', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/', function ({ socket }) {
      socket.exceptMe().emit('greet', 'virk')
    })

    server.listen(5000)

    const handler = function (name) {
      assert.equal(name, 'virk')
      server.close(done)
      client.disconnect()
      client1.disconnect()
    }

    let client = null
    let client1 = null
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
    client.on('greet', handler)
    client1.on('greet', handler)
  })

  it('should be able to emit messages to everyone but not to itself inside a namespace', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/chat', function ({ socket }) {
      socket.exceptMe().emit('greet', 'virk')
    })

    server.listen(5000)

    const handler = function (name) {
      assert.equal(name, 'virk')
      server.close(done)
      client.disconnect()
      client1.disconnect()
    }

    let client = null
    let client1 = null
    client = wsClient.connect(`${socketUrl}/chat`, options)
    client1 = wsClient.connect(`${socketUrl}/chat`, options)
    client.on('greet', handler)
    client1.on('greet', handler)
  })

  it('should be able to attach ES2015 generator listeners for events', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/', function ({ socket }) {
      socket.on('greet', function (username) {
        assert.equal(username, 'virk')
        server.close(done)
        client.disconnect()
      })
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.emit('greet', 'virk')
  })

  it('should be able to emit messages to itself only', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/', function ({ socket }) {
      socket.on('ready', function () {
        socket.toMe().emit('shout', socket.socket.id)
      })
    })
    .disconnected(function () {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        server.close(done)
      }
    })

    server.listen(5000)

    let disconnectedCounts = 0
    let eventsCount = 0
    let client = null
    let client1 = null
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
    client.on('shout', function (socketId) {
      eventsCount++
      assert.equal(client.id, socketId)
      client.disconnect()
    })

    client1.on('shout', function (socketId) {
      eventsCount++
      assert.equal(client1.id, socketId)
      client1.disconnect()
    })

    client.on('connect', function () {
      client1.on('connect', function () {
        client.emit('ready')
        client1.emit('ready')
      })
    })
  })

  it('should be able to emit messages to itself only inside a namespace', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/chat', function ({ socket }) {
      socket.on('ready', function () {
        console.log('ready')
        socket.toMe().emit('shout', socket.socket.id)
      })
    })
    .disconnected(function () {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        server.close(done)
      }
    })

    server.listen(5000)

    let disconnectedCounts = 0
    let eventsCount = 0
    let client = null
    let client1 = null
    client = wsClient.connect(`${socketUrl}/chat`, options)
    client1 = wsClient.connect(`${socketUrl}/chat`, options)
    client.on('shout', function (socketId) {
      eventsCount++
      assert.equal(`/chat#${client.id}`, socketId)
      client.disconnect()
    })

    client1.on('shout', function (socketId) {
      eventsCount++
      assert.equal(`/chat#${client1.id}`, socketId)
      client1.disconnect()
    })

    client.on('connect', function () {
      client1.on('connect', function () {
        client.emit('ready')
        client1.emit('ready')
      })
    })
  })

  it('should be able to emit messages to certain ids only', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/', function ({ socket }) {
      socket.on('ready', function (ids) {
        socket.to(ids).emit('shout', {from: socket.socket.id, to: ids})
      })
    })
    .disconnected(function ({ socket }) {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        client.disconnect()
        server.close(done)
      }
    })

    server.listen(5000)

    let eventsCount = 0
    let clientsReadyCount = 0
    let disconnectedCounts = 0
    let client = null
    let client1 = null
    let client2 = null
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
    client2 = wsClient.connect(socketUrl, options)

    client1.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(client1.id) > -1, true)
      client1.disconnect()
    })

    client2.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(client2.id) > -1, true)
      client2.disconnect()
    })

    client.on('shout', function () {
      assert.throws('I never asked for a message')
    })

    const handler = function () {
      clientsReadyCount++
      if (clientsReadyCount === 3) {
        client.emit('ready', [client1.id, client2.id])
      }
    }

    client.on('connect', handler)
    client1.on('connect', handler)
    client2.on('connect', handler)
  })

  it('should be able to emit messages to certain ids only inside a namespace', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/chat', function ({ socket }) {
      socket.on('ready', function (ids) {
        socket.to(ids).emit('shout', {from: socket.socket.id, to: ids})
      })
    })
    .disconnected(function ({ socket }) {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        client.disconnect()
        server.close(done)
      }
    })

    server.listen(5000)

    let eventsCount = 0
    let clientsReadyCount = 0
    let disconnectedCounts = 0
    let client = null
    let client1 = null
    let client2 = null
    client = wsClient.connect(`${socketUrl}/chat`, options)
    client1 = wsClient.connect(`${socketUrl}/chat`, options)
    client2 = wsClient.connect(`${socketUrl}/chat`, options)

    client1.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(`${client.nsp}#${client1.id}`) > -1, true)
      client1.disconnect()
    })

    client2.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(`${client1.nsp}#${client2.id}`) > -1, true)
      client2.disconnect()
    })

    client.on('shout', function () {
      assert.throws('I never asked for a message')
    })

    const handler = function () {
      clientsReadyCount++
      if (clientsReadyCount === 3) {
        client.emit('ready', [`${client1.nsp}#${client1.id}`, `${client2.nsp}#${client2.id}`])
      }
    }

    client.on('connect', handler)
    client1.on('connect', handler)
    client2.on('connect', handler)
  })

  it('should bind all class methods to the socket events which starts with on', function (done) {
    const server = http.createServer(function () {})

    class MyChannel {
      onReady () {
        server.close(done)
        client.disconnect()
      }
    }

    const io = socketio(server)
    new Channel(io, Context, '/', MyChannel)

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.emit('ready')
  })

  it('should retain the class instance when calling event methods', function (done) {
    const server = http.createServer(function () {})

    class MyChannel {
      onReady () {
        assert.instanceOf(this, MyChannel)
        server.close(done)
        client.disconnect()
      }
    }

    const io = socketio(server)
    new Channel(io, Context, '/', MyChannel)

    server.listen(5000)

    let client = null

    client = wsClient.connect(socketUrl, options)
    client.emit('ready', 'foo')
  })

  it('should be able to emit an event to all connected client using channel instance', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})

    channel.disconnected(function () {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        server.close(done)
      }
    })

    server.listen(5000)

    let client = null
    let client1 = null
    let eventsCount = 0
    let disconnectedCounts = 0
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client1.on('connect', function () {
      channel.emit('greet', 'Hello world')
    })

    client.on('greet', function () {
      eventsCount++
      client.disconnect()
    })

    client1.on('greet', function () {
      eventsCount++
      client1.disconnect()
    })
  })

  it('should be able to emit an event to all connected client using channel instance inside a namespace', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/chat', function () {})

    channel.disconnected(function () {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        server.close(done)
      }
    })

    server.listen(5000)

    let client = null
    let client1 = null
    let eventsCount = 0
    let disconnectedCounts = 0
    client = wsClient.connect(`${socketUrl}/chat`, options)
    client1 = wsClient.connect(`${socketUrl}/chat`, options)

    client1.on('connect', function () {
      channel.emit('greet', 'Hello world')
    })

    client.on('greet', function () {
      eventsCount++
      client.disconnect()
    })

    client1.on('greet', function () {
      eventsCount++
      client1.disconnect()
    })
  })

  it('should be able to emit messages to certain ids only', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})

    channel.disconnected(function ({ socket }) {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        client.disconnect()
        server.close(done)
      }
    })

    server.listen(5000)

    let clientsReadyCount = 0
    let disconnectedCounts = 0
    let eventsCount = 0
    let client = null
    let client1 = null
    let client2 = null
    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
    client2 = wsClient.connect(socketUrl, options)

    client1.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(client1.id) > -1, true)
      client1.disconnect()
    })

    client2.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(client2.id) > -1, true)
      client2.disconnect()
    })

    client.on('shout', function () {
      assert.throws('I never asked for a message')
    })

    const handler = function () {
      clientsReadyCount++
      if (clientsReadyCount === 3) {
        channel.to([client1.id, client2.id]).emit('shout', {to: [client1.id, client2.id]})
      }
    }

    client.on('connect', handler)
    client1.on('connect', handler)
    client2.on('connect', handler)
  })

  it('should be able to emit messages to certain ids only inside a namespace', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/chat', function () {})

    channel.disconnected(function ({ socket }) {
      disconnectedCounts++
      if (eventsCount === 2 && disconnectedCounts === 2) {
        client.disconnect()
        server.close(done)
      }
    })

    server.listen(5000)

    let clientsReadyCount = 0
    let disconnectedCounts = 0
    let eventsCount = 0
    let client = null
    let client1 = null
    let client2 = null
    client = wsClient.connect(`${socketUrl}/chat`, options)
    client1 = wsClient.connect(`${socketUrl}/chat`, options)
    client2 = wsClient.connect(`${socketUrl}/chat`, options)

    client1.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(client1.id) > -1, true)
      client1.disconnect()
    })

    client2.on('shout', function (payload) {
      eventsCount++
      assert.equal(payload.to.indexOf(client2.id) > -1, true)
      client2.disconnect()
    })

    client.on('shout', function () {
      assert.throws('I never asked for a message')
    })

    const handler = function () {
      clientsReadyCount++
      if (clientsReadyCount === 3) {
        channel.to([`/chat#${client1.id}`, `/chat#${client2.id}`]).emit('shout', {to: [client1.id, client2.id]})
      }
    }

    client.on('connect', handler)
    client1.on('connect', handler)
    client2.on('connect', handler)
  })

  it('should return the socket using its id', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      assert.equal(channel.get(client.id).socket.constructor.name, 'AdonisSocket')
      server.close(done)
      client.disconnect()
    })
  })

  it('should loop through all the middleware one by one', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)

    const middlewareCalls = []
    let client = null

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      assert.deepEqual(middlewareCalls, [1, 2])
      server.close(done)
      client.disconnect()
    })

    channel.middleware(function ({ socket, request }, next) {
      middlewareCalls.push(1)
      next()
    })

    channel.middleware(function ({ socket, request }, next) {
      middlewareCalls.push(2)
      next()
    })

    server.listen(5000)
    client = wsClient.connect(socketUrl, options)
  })

  it('should be able to create a websocket connection under a different namespace', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    /* eslint no-new: "off" */
    new Channel(io, Context, '/foo', function () {
      server.close(done)
      client.disconnect()
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(`${socketUrl}/foo`, options)
  })

  it('should invoke the onJoin method when a client emits join event', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.joinRoom(function ({ socket }, { room, body }) {
      assert.equal(room, 'lobby')
      assert.equal(socket.id, body.id)
      setTimeout(function () {
        assert.equal(socket.rooms.lobby, 'lobby')
        server.close(done)
        client.disconnect()
      })
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {id: client.id}})
    })
  })

  it('should throw exception when joinRoom is not a function', function () {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    try {
      const channel = new Channel(io, Context, '/', function () {})
      channel.joinRoom()
    } catch (e) {
      assert.equal(e.message, 'E_INVALID_PARAMETER: Make sure to pass a function for joinRoom event')
    }
  })

  it('should invoke the onJoin generator method when a client emits join event', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.joinRoom(function ({ socket }, { room, body }) {
      assert.equal(room, 'lobby')
      assert.equal(socket.id, body.id)
      setTimeout(function () {
        assert.equal(socket.rooms.lobby, 'lobby')
        server.close(done)
        client.disconnect()
      })
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {id: client.id}})
    })
  })

  it('should invoke client join event fn when able to join to a room', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    new Channel(io, Context, '/', function () {})

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      const fn = function (err, joined) {
        assert.equal(err, null)
        assert.equal(joined, true)
        server.close(done)
        client.disconnect()
      }
      client.emit('join:ad:room', {room: 'lobby', body: {}}, fn)
    })
  })

  it('should invoke the join fn with the error thrown inside the onJoin function', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.joinRoom(() => {
      throw new Error('Cannot make you join the room')
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      const fn = function (err) {
        assert.equal(err, 'Cannot make you join the room')
        server.close(done)
        client.disconnect()
      }
      client.emit('join:ad:room', {room: 'lobby', body: {}}, fn)
    })
  })

  it('should invoke the join fn with the error thrown inside the onJoin generator function', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.joinRoom(function () {
      throw new Error('Cannot make you join the room')
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      const fn = function (err) {
        assert.equal(err, 'Cannot make you join the room')
        server.close(done)
        client.disconnect()
      }
      client.emit('join:ad:room', {room: 'lobby', body: {}}, fn)
    })
  })

  it('should invoke the onLeave method when a client emits the leave event', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.leaveRoom(function ({ socket }, { room, body }) {
      assert.equal(room, 'lobby')
      assert.equal(socket.id, body.id)
      assert.equal(socket.rooms.lobby, 'lobby')
      setTimeout(function () {
        assert.equal(socket.rooms.lobby, undefined)
        server.close(done)
        client.disconnect()
      })
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('leave:ad:room', {room: 'lobby', body: {id: client.id}})
      })
    })
  })

  it('should call leaveRoom generator method when a client leaves a room', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.leaveRoom(function ({ socket }, { room, body }) {
      assert.equal(room, 'lobby')
      assert.equal(socket.id, body.id)
      assert.equal(socket.rooms.lobby, 'lobby')
      setTimeout(function () {
        assert.equal(socket.rooms.lobby, undefined)
        server.close(done)
        client.disconnect()
      })
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('leave:ad:room', {room: 'lobby', body: {id: client.id}})
      })
    })
  })

  it('should call leaveRoom fn method with the error when an error is thrown', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    const channel = new Channel(io, Context, '/', function () {})
    channel.leaveRoom(function ({ socket }, { room, body }) {
      assert.equal(socket.rooms.lobby, 'lobby')
      throw new Error('Cannot leave room')
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('leave:ad:room', {room: 'lobby', body: {id: client.id}}, function (error) {
          assert.equal(error, 'Cannot leave room')
          assert.equal(channel.get(client.id).socket.rooms.lobby, 'lobby')
          server.close(done)
          client.disconnect()
        })
      })
    })
  })

  it('should throw exception when leaveRoom is not a function', function () {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    try {
      const channel = new Channel(io, Context, '/', function () {})
      channel.leaveRoom()
    } catch (e) {
      assert.equal(e.message, 'E_INVALID_PARAMETER: Make sure to pass a function for leaveRoom event')
    }
  })

  it('should invoke the onJoin method defined on the class prototype', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    class ChannelController {
      joinRoom ({ socket }, { room, body }) {
        assert.equal(room, 'lobby')
        assert.equal(socket.id, body.id)
        setTimeout(function () {
          assert.equal(socket.rooms.lobby, 'lobby')
          server.close(done)
          client.disconnect()
        })
      }
    }
    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {id: client.id}})
    })
  })

  it('should invoke the onJoin generator method defined on the class prototype', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)
    class ChannelController {
      * joinRoom ({ socket }, { room, body }) {
        assert.equal(room, 'lobby')
        assert.equal(socket.id, body.id)
        setTimeout(function () {
          assert.equal(socket.rooms.lobby, 'lobby')
          server.close(done)
          client.disconnect()
        })
      }
    }
    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {id: client.id}})
    })
  })

  it('should invoke the onLeave method on class instance when a client emits the leave event', function (done) {
    const server = http.createServer(function (req, res) {})

    const io = socketio(server)

    class ChannelController {
      leaveRoom ({ socket }, { room, body }) {
        assert.equal(room, 'lobby')
        assert.equal(socket.id, body.id)
        assert.equal(socket.rooms.lobby, 'lobby')
        setTimeout(function () {
          assert.equal(socket.rooms.lobby, undefined)
          server.close(done)
          client.disconnect()
        })
      }
    }

    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('leave:ad:room', {room: 'lobby', body: {id: client.id}})
      })
    })
  })

  it('socket client itself should not recieve the message when emit scope is not set to everyone', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    let grettingReceivedCounts = 0
    let disconnectCount = 0

    class ChannelController {
      constructor ({ socket }) {
        this.socket = socket
      }

      onReady () {
        this.socket.inRoom('lobby').emit('greeting', 'Hello world')
      }

      disconnected () {
        disconnectCount++
        if (disconnectCount === 1) {
          client.disconnect()
          assert.equal(grettingReceivedCounts, 1)
          server.close(done)
        }
      }
    }

    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null
    let client1 = null

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client.on('greeting', function () {
      grettingReceivedCounts++
    })

    client1.on('greeting', function () {
      grettingReceivedCounts++
      client1.disconnect()
    })

    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}})
    })

    client1.on('connect', function () {
      client1.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('ready')
      })
    })
  })

  it('socket throw exception when trying to set scope to just me and emitting to a room', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)

    class ChannelController {
      constructor ({ socket }) {
        this.socket = socket
      }

      onReady () {
        try {
          this.socket.toMe().inRoom('lobby').emit('greeting', 'Hello world')
        } catch (e) {
          assert.equal(e.message, 'E_UNDEFINED_METHOD: You are trying to send a message to yourself inside a room. Instead use toMe().emit()')
          client.disconnect()
          server.close(done)
        }
      }
    }

    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null

    client = wsClient.connect(socketUrl, options)

    client.on('connect', function () {
      client.emit('ready')
    })
  })

  it('socket throw exception when trying to set scope to just me and emitting to multiple rooms', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)

    class ChannelController {
      constructor ({ socket }) {
        this.socket = socket
      }

      onReady () {
        try {
          this.socket.toMe().inRooms(['lobby']).emit('greeting', 'Hello world')
        } catch (e) {
          assert.equal(e.message, 'E_UNDEFINED_METHOD: You are trying to send a message to yourself inside a room. Instead use toMe().emit()')
          client.disconnect()
          server.close(done)
        }
      }
    }

    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null

    client = wsClient.connect(socketUrl, options)

    client.on('connect', function () {
      client.emit('ready')
    })
  })

  it('socket client should recieve the message when a message is broadcasted to a room', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    let grettingReceivedCounts = 0
    let disconnectCount = 0

    class ChannelController {
      constructor ({ socket }) {
        this.socket = socket
      }

      onReady () {
        this.socket.toEveryone().inRoom('lobby').emit('greeting', 'Hello world')
      }

      disconnected () {
        disconnectCount++
        if (disconnectCount === 2) {
          assert.equal(grettingReceivedCounts, 2)
          server.close(done)
        }
      }
    }

    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null
    let client1 = null

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client.on('greeting', function (room) {
      assert.equal(room, 'lobby')
      grettingReceivedCounts++
      client.disconnect()
    })

    client1.on('greeting', function (room) {
      assert.equal(room, 'lobby')
      grettingReceivedCounts++
      client1.disconnect()
    })

    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}})
    })

    client1.on('connect', function () {
      client1.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('ready')
      })
    })
  })

  it('socket client should recieve the message when a message is broadcasted in multiple rooms', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    let grettingReceivedCounts = 0
    let disconnectCount = 0

    class ChannelController {
      constructor ({ socket }) {
        this.socket = socket
      }

      onReady () {
        this.socket.toEveryone().inRooms(['lobby']).emit('greeting', 'Hello world')
      }

      disconnected () {
        disconnectCount++
        if (disconnectCount === 2) {
          assert.equal(grettingReceivedCounts, 2)
          server.close(done)
        }
      }
    }

    new Channel(io, Context, '/', ChannelController)
    server.listen(5000)

    let client = null
    let client1 = null

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client.on('greeting', function () {
      grettingReceivedCounts++
      client.disconnect()
    })

    client1.on('greeting', function () {
      grettingReceivedCounts++
      client1.disconnect()
    })

    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}})
    })

    client1.on('connect', function () {
      client1.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('ready')
      })
    })
  })

  it('socket client should recieve the message when a message is broadcasted to a room via channel instance', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    let grettingReceivedCounts = 0
    let disconnectCount = 0

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      socket.on('ready', function () {
        channel.inRoom('lobby').emit('greeting', 'Hello world')
      })
    })

    channel.disconnected(function () {
      disconnectCount++
      if (disconnectCount === 2) {
        assert.equal(grettingReceivedCounts, 2)
        server.close(done)
      }
    })

    server.listen(5000)

    let client = null
    let client1 = null

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client.on('greeting', function (room) {
      assert.equal(room, 'lobby')
      grettingReceivedCounts++
      client.disconnect()
    })

    client1.on('greeting', function (room) {
      assert.equal(room, 'lobby')
      grettingReceivedCounts++
      client1.disconnect()
    })

    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}})
    })

    client1.on('connect', function () {
      client1.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('ready')
      })
    })
  })

  it('should be able to emit messages to multiple rooms', function (done) {
    const server = http.createServer(function (req, res) {})
    const io = socketio(server)
    let grettingReceivedCounts = 0
    let disconnectCount = 0

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      socket.on('ready', function () {
        channel.inRooms(['lobby']).emit('greeting', 'Hello world')
      })
    })

    channel.disconnected(function () {
      disconnectCount++
      if (disconnectCount === 2) {
        assert.equal(grettingReceivedCounts, 2)
        server.close(done)
      }
    })

    server.listen(5000)

    let client = null
    let client1 = null

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client.on('greeting', function () {
      grettingReceivedCounts++
      client.disconnect()
    })

    client1.on('greeting', function () {
      grettingReceivedCounts++
      client1.disconnect()
    })

    client.on('connect', function () {
      client.emit('join:ad:room', {room: 'lobby', body: {}})
    })

    client1.on('connect', function () {
      client1.emit('join:ad:room', {room: 'lobby', body: {}}, function () {
        client.emit('ready')
      })
    })
  })

  it('should be able to track sockets for a given channel', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      channel.presence.track(socket, 1, {device: 'chrome'})
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.on('presence:state', function (state) {
      assert.deepEqual(state, [{
        id: 1,
        payload: [{
          socketId: client.id,
          meta: {device: 'chrome'}
        }]
      }])
      server.close(done)
      client.disconnect()
    })
  })

  it('should be able to track multiple sockets for a multiple users', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      channel.presence.track(socket, socket.id, {device: 'chrome'})
    })

    server.listen(5000)

    let client = null
    let client1 = null
    let sequence = 0

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client1.on('presence:state', function (state) {
      sequence++
      if (sequence === 1) {
        assert.deepEqual(state, [{
          id: client.id,
          payload: [{
            socketId: client.id,
            meta: {device: 'chrome'}
          }]
        }, {
          id: client1.id,
          payload: [{
            socketId: client1.id,
            meta: {device: 'chrome'}
          }]
        }])
        client.disconnect()
        client1.disconnect()
        server.close(done)
      }
    })
  })

  it('should publish presence when a tracked socket disconnects', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      channel.presence.track(socket, 1, {device: 'chrome'})
    })

    server.listen(5000)

    let client = null
    let client1 = null
    let sequence = 0

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)

    client1.on('presence:state', function (state) {
      sequence++
      if (sequence === 1) {
        assert.deepEqual(state, [{
          id: 1,
          payload: [{
            socketId: client.id,
            meta: {device: 'chrome'}
          }, {
            socketId: client1.id,
            meta: {device: 'chrome'}
          }]
        }])
        assert.lengthOf(channel.presence._usersPool['1'], 2)
        client.disconnect()
      } else {
        assert.deepEqual(state, [{
          id: 1,
          payload: [{
            socketId: client1.id,
            meta: {device: 'chrome'}
          }]
        }])
        assert.lengthOf(channel.presence._usersPool['1'], 1)
        client1.disconnect()
        server.close(done)
      }
    })
  })

  it('should publish presence when a tracked is disconnected by pulling of the list', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      channel.presence.track(socket, 1, {device: 'chrome'})
    })

    server.listen(5000)

    let client = null
    let client1 = null
    let sequence = 0
    let statePublishedCounts = 0

    client = wsClient.connect(socketUrl, options)
    client1 = wsClient.connect(socketUrl, options)
    const handler = function () {
      sequence++
      if (sequence === 2) {
        const firstClient = channel.presence.pull(1, function (item) {
          return item.socket.id === client.id
        })
        firstClient[0].socket.disconnect()
      }
    }
    client.on('connect', handler)
    client1.on('connect', handler)
    client1.on('presence:state', function (state) {
      statePublishedCounts++
      if (statePublishedCounts === 2) {
        assert.deepEqual(state, [{
          id: 1,
          payload: [{
            socketId: client1.id,
            meta: {device: 'chrome'}
          }]
        }])
        client1.disconnect()
        server.close(done)
      }
    })
  })

  it('should not hijack the disconnected function on the channel when tracking a socket', function (done) {
    const server = http.createServer(function () {})
    const io = socketio(server)

    const channel = new Channel(io, Context, '/', function ({ socket }) {
      channel.presence.track(socket, 1, {device: 'chrome'})
    }).disconnected(function () {
      server.close(done)
    })

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
    client.disconnect()
  })

  it('should pass presence reference to the class instance', function (done) {
    const server = http.createServer(function () {})

    class ChannelController {
      constructor ({ socket, request }, presence) {
        assert.instanceOf(presence, Presence)
        server.close(done)
        client.disconnect()
      }
    }

    const io = socketio(server)
    new Channel(io, Context, '/', ChannelController)

    server.listen(5000)

    let client = null
    client = wsClient.connect(socketUrl, options)
  })

  it('should pass presence reference to the channel closure', function (done) {
    const server = http.createServer(function () {})

    const io = socketio(server)
    new Channel(io, Context, '/', function ({ socket, request }, presence) {
      assert.instanceOf(presence, Presence)
      server.close(done)
      client.disconnect()
    })

    server.listen(5000)
    let client = null
    client = wsClient.connect(socketUrl, options)
  })
})
