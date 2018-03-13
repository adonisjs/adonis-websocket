'use strict'

/**
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const JsonEncoder = require('../../src/JsonEncoder/index.js')

test.group('JsonEncoder', (group) => {
  test('encode value', (assert, done) => {
    assert.plan(1)

    JsonEncoder.encode({ name: 'virk' }, (error, payload) => {
      if (error) {
        done(error)
        return
      }

      assert.equal(payload, JSON.stringify({ name: 'virk' }))
      done()
    })
  })

  test('pass encoding error to callback', (assert, done) => {
    assert.plan(1)

    const obj = {}
    Object.defineProperty(obj, 'name', {
      enumerable: true,
      get () {
        throw new Error('bad')
      }
    })

    JsonEncoder.encode(obj, (error, payload) => {
      assert.equal(error.message, 'bad')
      done()
    })
  })

  test('decode json string', (assert, done) => {
    assert.plan(1)
    JsonEncoder.decode(JSON.stringify({ name: 'virk' }), (error, payload) => {
      if (error) {
        done(error)
        return
      }

      assert.deepEqual(payload, { name: 'virk' })
      done()
    })
  })
})
