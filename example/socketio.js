const app = require('http').createServer(function (req, res) {
  res.write(`
<script>
  const client = new window.WebSocket('ws://localhost:4000/socket.io/?EIO=3&transport=websocket')
</script>
  `)
  res.end()
})
const io = require('socket.io')(app)

process.title = 'socket-ws'

app.listen(4000)

io.on('connection', function (socket) {
})
