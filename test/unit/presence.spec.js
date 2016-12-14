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
const Presence = require('../../src/Presence')

const io = {
  emit: function () {}
}

describe('Presence', function () {
  it('should be able to track a user and a socket', function () {
    const presence = new Presence(io)
    const socket = {
      id: 2,
      on: function () {}
    }
    presence.track(socket, 1)
    assert.lengthOf(presence._users[1], 1)
    assert.equal(presence._users[1][0].socket.id, 2)
  })

  it('should be able to track multiple users and thier sockets', function () {
    const presence = new Presence(io)
    const socket = {
      id: 2,
      on: function () {}
    }
    const socket1 = {
      id: 3,
      on: function () {}
    }
    presence.track(socket, 1)
    presence.track(socket1, 2)
    assert.lengthOf(presence._users[1], 1)
    assert.lengthOf(presence._users[2], 1)
    assert.equal(presence._users[1][0].socket.id, 2)
    assert.equal(presence._users[2][0].socket.id, 3)
  })

  it('should be able to track a multiple sockets for a given user', function () {
    const presence = new Presence(io)
    const socket = {
      id: 2,
      on: function () {}
    }
    const socket1 = {
      id: 3,
      on: function () {}
    }
    presence.track(socket, 1)
    presence.track(socket1, 1)
    assert.lengthOf(presence._users[1], 2)
    assert.equal(presence._users[1][0].socket.id, 2)
    assert.equal(presence._users[1][1].socket.id, 3)
  })

  it('should be able to pull certain sockets', function () {
    const presence = new Presence(io)
    const socket = {
      id: 2,
      on: function () {}
    }
    const socket1 = {
      id: 3,
      on: function () {}
    }
    presence.track(socket, 1, {device: 'chrome'})
    presence.track(socket1, 1, {device: 'iphone'})
    const iphoneSocket = presence.pull(1, (item) => item.meta.device === 'iphone')
    assert.equal(iphoneSocket[0].socket.id, 3)
    assert.lengthOf(presence._users[1], 1)
  })

  it('should remove the socket from the list when disconnect event is triggered', function () {
    const presence = new Presence(io)
    const socket = {
      id: 2,
      cb: null,
      on: function (event, cb) {
        this.cb = cb
      }
    }
    const socket1 = {
      id: 3,
      on: function () {}
    }
    presence.track(socket, 1, {device: 'chrome'})
    presence.track(socket1, 1, {device: 'iphone'})
    socket.cb()
    assert.lengthOf(presence._users[1], 1)
  })

  it('should publish presence as soon as a socket is tracked', function () {
    const io = {
      payload: null,
      event: null,
      emit: function (event, payload) {
        this.event = event
        this.payload = payload
      }
    }
    const presence = new Presence(io)
    const socket = {
      id: 2,
      on: function () {}
    }
    const socket1 = {
      id: 3,
      on: function () {}
    }
    presence.track(socket, 1, {device: 'chrome'})
    assert.deepEqual(io.payload, [{
      id: 1,
      payload: [
        {
          socketId: 2,
          meta: {
            device: 'chrome'
          }
        }
      ]
    }])
    presence.track(socket1, 1)
    assert.deepEqual(io.payload, [{
      id: 1,
      payload: [
        {
          socketId: 2,
          meta: {
            device: 'chrome'
          }
        },
        {
          socketId: 3,
          meta: null
        }
      ]
    }])
  })

  it('should publish presence as soon as a socket is disconnected', function () {
    const io = {
      payload: null,
      event: null,
      emit: function (event, payload) {
        this.event = event
        this.payload = payload
      }
    }
    const presence = new Presence(io)
    const socket = {
      id: 2,
      cb: null,
      on: function (event, cb) {
        this.cb = cb
      }
    }
    const socket1 = {
      id: 3,
      on: function () {}
    }
    presence.track(socket, 1, {device: 'chrome'})
    assert.deepEqual(io.payload, [{
      id: 1,
      payload: [
        {
          socketId: 2,
          meta: {
            device: 'chrome'
          }
        }
      ]
    }])
    presence.track(socket1, 1)
    assert.deepEqual(io.payload, [{
      id: 1,
      payload: [
        {
          socketId: 2,
          meta: {
            device: 'chrome'
          }
        },
        {
          socketId: 3,
          meta: null
        }
      ]
    }])
    socket.cb()
    assert.deepEqual(io.payload, [{
      id: 1,
      payload: [
        {
          socketId: 3,
          meta: null
        }
      ]
    }])
  })
})
