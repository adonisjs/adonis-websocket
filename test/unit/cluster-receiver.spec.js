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
const clusterReceiver = require('../../src/ClusterHop/receiver')
const ChannelManager = require('../../src/Channel/Manager')
const stderr = require('test-console').stderr

test.group('Cluster Receiver', (group) => {
  test('ignore message when it\'s not json', (assert) => {
    assert.plan(1)
    const inspect = stderr.inspect()

    clusterReceiver({ name: 'virk' })

    inspect.restore()
    assert.equal(inspect.output[0].trim(), 'adonis:websocket dropping packet, since it is not valid')
  })

  test('ignore message when handle is missing', (assert) => {
    assert.plan(1)
    const inspect = stderr.inspect()

    clusterReceiver(JSON.stringify({ topic: 'chat' }))

    inspect.restore()
    assert.equal(inspect.output[0].trim(), 'adonis:websocket dropping packet, since handle is missing')
  })

  test('ignore message when handle is not one of the allowed handles', (assert) => {
    assert.plan(1)
    const inspect = stderr.inspect()

    clusterReceiver(JSON.stringify({ topic: 'chat', handle: 'foo' }))

    inspect.restore()
    assert.equal(inspect.output[0].trim(), 'adonis:websocket dropping packet, since foo handle is not allowed')
  })

  test('ignore message when topic cannot be handled by any channel', (assert) => {
    assert.plan(1)
    const inspect = stderr.inspect()

    clusterReceiver(JSON.stringify({ topic: 'chat', handle: 'broadcast' }))

    inspect.restore()
    assert.equal(inspect.output[0].trim(), 'adonis:websocket broadcast topic chat cannot be handled by any channel')
  })

  test('send message to channel responsible for handling the topic', (assert, done) => {
    assert.plan(2)
    const channel = ChannelManager.add('chat', () => {})

    channel.clusterBroadcast = function (topic, payload) {
      assert.equal(topic, 'chat')
      assert.equal(payload, 'hello')
      done()
    }

    clusterReceiver(JSON.stringify({ topic: 'chat', handle: 'broadcast', payload: 'hello' }))
    ChannelManager.clear()
  })
})
