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

Ws.channel('chat', ({ socket }) => {
  console.log('new socket joined %s', socket.id)
})
```

## Middleware

The middleware for websocket are kept in the `start/wsKernel.js` file.


```js
const Ws = use('Ws')

const globalMiddleware = []
const namedMiddleware = {}

Ws
  .registerGlobal(globalMiddleware)
  .registerNamed(namedMiddleware)
```
