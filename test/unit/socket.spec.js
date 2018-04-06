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
const Socket = require('../../src/Socket')
const helpers = require('../helpers')

const FakeConnection = helpers.getFakeConnection()
const FakeChannel = helpers.getFakeChannel()

test.group('Socket', () => {
  test('inherit id from connection id', (assert) => {
    const socket = new Socket('chat', new FakeConnection(123))
    assert.equal(socket.id, 'chat#123')
  })

  test('socket must have ready only topic name', (assert) => {
    const socket = new Socket('chat', new FakeConnection())
    assert.equal(socket.topic, 'chat')
    const fn = () => (socket.topic = 'foo')
    assert.throw(fn, 'Cannot set property topic of #<Socket> which has only a getter')
  })

  test('associate channel when associateChannel method is called', (assert) => {
    const socket = new Socket('chat', new FakeConnection())
    socket.associateChannel(new FakeChannel('chat'))
    assert.instanceOf(socket.channel, FakeChannel)
  })

  test('on close emit the close event', (assert, done) => {
    const socket = new Socket('chat', new FakeConnection())
    socket.associateChannel(new FakeChannel('chat'))

    socket.on('close', function () {
      done()
    })
    socket.close()
  })

  test('on close remove all event listeners', async (assert) => {
    const socket = new Socket('chat', new FakeConnection())
    const channel = new FakeChannel('chat')

    socket.associateChannel(channel)
    socket.on('close', function () {})
    assert.equal(socket.emitter.listenerCount(), 1)

    await socket.close()
    assert.equal(socket.emitter.listenerCount(), 0)
  })

  test('on close remove all event listeners even when close event throws exception', async (assert) => {
    const socket = new Socket('chat', new FakeConnection())
    const channel = new FakeChannel('chat')

    socket.associateChannel(channel)

    socket.on('close', function () {
      throw new Error('foo')
    })
    assert.equal(socket.emitter.listenerCount(), 1)

    await socket.close()
    assert.equal(socket.emitter.listenerCount(), 0)
  })
})

test.group('Socket emitting', () => {
  test('emit event to itself', (assert, done) => {
    assert.plan(3)

    const connection = new FakeConnection()
    const socket = new Socket('chat', connection)
    const channel = new FakeChannel('chat')

    connection.sendEvent = function (topic, event, data) {
      assert.equal(topic, 'chat')
      assert.equal(event, 'hello')
      assert.equal(data, 'world')
      done()
    }

    socket.associateChannel(channel)
    socket.emit('hello', 'world')
  })

  test('broadcast message to entire channel except itself by encoding the message', (assert, done) => {
    assert.plan(3)

    const socket = new Socket('chat', new FakeConnection())
    const socket1 = new Socket('chat', new FakeConnection())

    const channel = new FakeChannel('chat')
    channel.broadcastPayload = function (topic, payload, filterIds) {
      done(() => {
        assert.equal(topic, 'chat')
        assert.deepEqual(payload, { topic: 'chat', event: 'hello', data: 'world' })
        assert.deepEqual(filterIds, [socket.id])
      })
    }

    socket.associateChannel(channel)
    socket1.associateChannel(channel)

    socket.broadcast('hello', 'world')
  })

  test('broadcast message to entire channel by encoding the message', (assert, done) => {
    assert.plan(3)

    const socket = new Socket('chat', new FakeConnection())
    const socket1 = new Socket('chat', new FakeConnection())

    const channel = new FakeChannel('chat')
    channel.broadcastPayload = function (topic, payload, filterIds) {
      done(() => {
        assert.equal(topic, 'chat')
        assert.deepEqual(payload, { topic: 'chat', event: 'hello', data: 'world' })
        assert.deepEqual(filterIds, [])
      })
    }

    socket.associateChannel(channel)
    socket1.associateChannel(channel)

    socket.broadcastToAll('hello', 'world')
  })

  test('broadcast message to selected socket ids', (assert, done) => {
    assert.plan(4)

    const socket = new Socket('chat', new FakeConnection())
    const socket1 = new Socket('chat', new FakeConnection())
    const socket2 = new Socket('chat', new FakeConnection())

    const channel = new FakeChannel('chat')
    channel.broadcastPayload = function (topic, payload, filterIds, inverse) {
      done(() => {
        assert.equal(topic, 'chat')
        assert.deepEqual(payload, { topic: 'chat', event: 'hello', data: 'world' })
        assert.deepEqual(filterIds, [socket1.id, socket2.id])
        assert.isTrue(inverse)
      })
    }

    socket.associateChannel(channel)
    socket1.associateChannel(channel)
    socket2.associateChannel(channel)

    socket.emitTo('hello', 'world', [socket1.id, socket2.id])
  })

  test('throw exception when ids array is not passed to emitTo', (assert) => {
    const socket = new Socket('chat', new FakeConnection())
    const channel = new FakeChannel('chat')

    socket.associateChannel(channel)

    const fn = () => socket.emitTo('hello', 'world')
    assert.throw(fn, /E_INVALID_PARAMETER: emitTo expects 3rd parameter to be an array of socket ids/)
  })
})
