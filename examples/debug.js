'use strict'

const Channel = require('../src/Channel')
const socketio = require('socket.io')
const http = require('http')
const path = require('path')
const html = require('fs').readFileSync(path.join(__dirname, './index.html'), 'utf8')

const server = http.createServer(function (req, res) {
  res.writeHead(200, {'content-type': 'text/html'})
  res.write(html)
  res.end()
})

class NewSocket {
  constructor (socket) {
    this.socket = socket
    console.log('new connection', socket.socket.id)
  }

  onReady () {
    this.socket.toMe().emit('my:id', this.socket.socket.id)
  }
}

const io = socketio(server)

const channel = new Channel(io, '/', NewSocket)
channel.disconnected(function (socket) {
  console.log('connection off', socket.socket.id)
})
server.listen(5000)
