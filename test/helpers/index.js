'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const WebSocket = require('ws')
const http = require('http')
const cuid = require('cuid')
const querystring = require('querystring')

module.exports = {
  startClient (query = {}, path = '/', port = 8000) {
    let url = `http://localhost:${port}${path}`
    url = query && Object.keys(query).length ? `${url}?${querystring.stringify(query)}` : url
    return new WebSocket(url)
  },

  startHttpServer (port = 8000) {
    const httpServer = http.createServer((req, res) => {})
    httpServer.listen(port)
    return httpServer
  },

  startWsServer (port) {
    return new WebSocket.Server({
      server: this.startHttpServer(port)
    })
  },

  getFakeChannel () {
    return class FakeChannel {
      constructor (name) {
        this.subscriptions = new Map()
        this.name = name
      }

      broadcast (topic, event, data, filterSockets = []) {
        this.subscriptions.get(topic).forEach((socket) => {
          if (filterSockets.indexOf(socket.id) === -1) {
            socket.emit(event, data)
          }
        })
      }
    }
  },

  getFakeConnection () {
    return class FakeConnection {
      constructor (id) {
        this.id = id || cuid()
      }

      encodePacket (message, cb) {
        cb(null, message)
      }

      makeEventPacket (topic, event, data) {
        return { topic, event, data }
      }

      sendLeavePacket () {
      }
    }
  }
}
