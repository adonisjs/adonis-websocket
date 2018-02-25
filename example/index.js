'use strict'

const http = require('http')
const { Config } = require('@adonisjs/sink')
const fs = require('fs')
const path = require('path')

const Ws = require('../src/Ws')
const ws = new Ws(new Config())

const server = http.createServer((req, res) => {
  const html = fs.readFileSync(path.join(__dirname, './index.html'))
  res.writeHead(200, { 'content-type': 'text/html' })
  res.write(html)
  res.end()
})

ws.listen(server)
server.listen(3000)
