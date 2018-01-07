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
const { resolver, ioc: Ioc } = require('@adonisjs/fold')
const co = require('co')
const Middleware = require('../../src/Middleware')

resolver.directories({
  wsControllers: 'Controllers/Ws'
})
resolver.appNamespace('App')

describe('Middleware', function () {
  beforeEach(function () {
    Middleware.clear()
  })

  it('should be able to register global middleware to the store', function () {
    Middleware.global(['foo', 'bar'])
    assert.deepEqual(Middleware.getStore()._store.global, ['foo', 'bar'])
  })

  it('should be able to register named middleware to the store', function () {
    Middleware.named({
      foo: 'App/Foo',
      bar: 'App/Bar'
    })
    assert.deepEqual(Middleware.getStore()._store.named, [{foo: 'App/Foo', bar: 'App/Bar'}])
  })

  it('should be able to resolve named middleware', function () {
    Middleware.named({
      foo: 'App/Foo',
      bar: 'App/Bar'
    })
    const resolved = Middleware.resolve(['foo'])
    assert.deepEqual(resolved, [{namespace: 'App/Foo', args: null}])
  })

  it('should return empty array when no named middleware have been passed', function () {
    Middleware.named({
      foo: 'App/Foo',
      bar: 'App/Bar'
    })
    const resolved = Middleware.resolve([])
    assert.deepEqual(resolved, [])
  })

  it('should throw exception when trying to resolve an undefined named middleware', function () {
    Middleware.named({
      foo: 'App/Foo',
      bar: 'App/Bar'
    })
    const resolved = () => Middleware.resolve(['baz'])
    assert.throw(resolved, 'RuntimeException: E_MISSING_NAMED_MIDDLEWARE: baz is not registered as a named middleware for Websockets')
  })

  it('should parse the named middleware runtime arguments', function () {
    Middleware.named({
      foo: 'App/Foo',
      bar: 'App/Bar'
    })
    const resolved = Middleware.resolve(['foo:1,2'])
    assert.deepEqual(resolved, [{namespace: 'App/Foo', args: ['1', '2']}])
  })

  it('should concat global middleware with named middleware', function () {
    Middleware.global(['Cors', 'Shield'])
    Middleware.named({
      foo: 'App/Foo',
      bar: 'App/Bar'
    })
    const resolved = Middleware.resolve(['foo:1,2'], true)
    assert.deepEqual(resolved, ['Cors', 'Shield', {namespace: 'App/Foo', args: ['1', '2']}])
  })

  it('should compose and run middleware via constructing them properly', function (done) {
    class AuthInit {
      async wsHandle ({ socket, request }, next) {
        request.count++
        await next()
      }
    }

    class Auth {
      async wsHandle ({ socket, request }, next, scheme) {
        request.count++
        request.scheme = scheme
        await next()
      }
    }

    Ioc.bind('Adonis/Src/AuthInit', function () {
      return new AuthInit()
    })

    Ioc.bind('Adonis/Src/Auth', function () {
      return new Auth()
    })

    Middleware.global(['Adonis/Src/AuthInit'])

    Middleware.named({
      auth: 'Adonis/Src/Auth'
    })

    const resolved = Middleware.resolve(['auth:basic'], true)
    const socket = {}
    const request = {count: 0}
    const composed = Middleware.compose(resolved, { socket, request })
    co(async function () {
      await composed()
    }).then(() => {
      assert.equal(request.count, 2)
      assert.equal(request.scheme, 'basic')
      done()
    }).catch(done)
  })
})
