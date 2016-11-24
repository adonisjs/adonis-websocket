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
const util = require('../../lib/util')

describe('Util', function () {
  it('should remove the beginning from a method name', function () {
    assert.equal(util.generateEventName('onReady'), 'ready')
  })

  it('should replace uppercase characters with :', function () {
    assert.equal(util.generateEventName('onUserReady'), 'user:ready')
  })

  it('should not replace on keyword within the middle of the string', function () {
    assert.equal(util.generateEventName('onUserOnReady'), 'user:on:ready')
  })
})
