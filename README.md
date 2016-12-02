# Adonis WebSocket
This repo contains the code for WebSocket provider to be hooked into AdonisJs application.

```javascript
Ws.channel('/chat', 'ChatController')

class ChatController {

  constructor (socket, request) {
    this.socket = socket
    this.request = request
  }

  /** Joining a room */
  joinRoom () {
  }

  /** Leaving a room */
  leaveRoom () {
  }

  /** Disconnecting */
  disconnected () {
  }

}

Ws
.channel('/chat', function (socket, request) {
})
.joinRoom(function () {
})
.leaveRoom(function () {
})
.disconnected(function () {
})

Ws.channel('/') // returns channel
Ws.channel('/', Class || closure) // creates channel if not created
```
