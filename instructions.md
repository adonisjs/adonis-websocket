# Register provider

The provider must be registered inside `start/app.js` file.

```js
const providers = [
  '@adonisjs/websocket/providers/WsProvider'
]
```

## Channels

The next step is to open `start/socket.js` and register websocket channels.

```js
const Ws = use('Ws')
const Server = use('Server')

Ws.channel('chat', ({ socket }) => {
  console.log('new socket joined %s', socket.id)
})

Ws.listen(Server.getInstance())
```

## Middleware

The middleware for websocket are kept within the same `start/kernel.js` file.


```js
const Ws = use('Ws')

const wsGlobalMiddleware = []
const wsNamedMiddleware = {}

Ws
  .registerGlobal(wsGlobalMiddleware)
  .registerNamed(wsNamedMiddleware)
```
