<p align="center">
  <a href="http://adonisjs.com"><img src="https://cloud.githubusercontent.com/assets/2793951/21009311/3d5dd062-bd46-11e6-9f01-a1c2ff6fad37.png" alt="AdonisJs WebSocket"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/adonis-websocket"><img src="https://img.shields.io/npm/v/adonis-websocket.svg?style=flat-square" alt="Version"></a>
  <a href="https://travis-ci.org/adonisjs/adonis-websocket"><img src="https://img.shields.io/travis/adonisjs/adonis-websocket/master.svg?style=flat-square" alt="Build Status"></a>
  <a href="https://coveralls.io/github/adonisjs/adonis-websocket?branch=master"><img src="https://img.shields.io/coveralls/adonisjs/adonis-websocket/master.svg?style=flat-square" alt="Coverage Status"></a>
  <a href="https://www.npmjs.com/package/adonis-websocket"><img src="https://img.shields.io/npm/dt/adonis-websocket.svg?style=flat-square" alt="Downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/adonis-websocket.svg?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <a href="https://gitter.im/adonisjs/adonis-framework"><img src="https://img.shields.io/badge/gitter-join%20us-1DCE73.svg?style=flat-square" alt="Gitter"></a>
  <a href="https://trello.com/b/yzpqCgdl/adonis-for-humans"><img src="https://img.shields.io/badge/trello-roadmap-89609E.svg?style=flat-square" alt="Trello"></a>
  <a href="https://www.patreon.com/adonisframework"><img src="https://img.shields.io/badge/patreon-support%20AdonisJs-brightgreen.svg?style=flat-square" alt="Support AdonisJs"></a>
</p>

<br>
Adonis Websocket is the official **websockets** provider for AdonisJs. It lets you easily setup/authenticate channels and rooms with elegant syntax and power of ES2015 generators.:rocket:

<br>
<hr>
<br>

<br>
## <a name="requirements"></a>Setup
Follow the below instructions to setup this provider

### Install
```bash
npm i --save adonis-websocket
```

### Setting up the provider
All providers are registered inside `start/app.js` file.

```javascript
const providers = [
  'adonis-websocket/providers/WsProvider'
]
```

### Setting up the alias
Aliases makes it easier to reference a namespace with a short unique name. Aliases are also registered inside `start/app.js` file.

```javascript
const aliases = {
  Ws: 'Adonis/Addons/Ws'
}
```

Setup process is done. Let's use the **Ws** provider now.


#### Create file `socket.js` and `ws.js`
* In folder `start` create file `socket.js` and `ws.js`
```bash
touch start/socket.js
touch start/ws.js
```

- `socket.js` register chanel
- `ws.js` kennel of websocket, i be can config middleware in here

### Chanel Base
* Create Channel base listen connection to path of websocket, in file `socket.js`

```js
const Ws = use('Ws')

// Ws.channel('/chat', function (contextWs) {
Ws.channel('/chat', function ({ socket }) {
  // here you go
})

```

### Add Middleware
* Config in file `ws` name and global

#### Middlleware global
```js
const Ws = use('Ws')

const globalMiddlewareWs = [
  'Adonis/Middleware/AuthInitWs'
]

const namedMiddlewareWs = {
  auth: 'Adonis/Middleware/AuthWs'
}

Ws.global(globalMiddlewareWs)
Ws.named(namedMiddlewareWs)
```

#### Middleware Channel

* we have two middleware default is `Adonis/Middleware/AuthInitWs` and `Adonis/Middleware/AuthWs` using authentication is compatible with `Adonis Auth`

```js
Ws.channel('/chat', function ({ socket }) {
  // here you go
}).middleware(<name middleware | function>)
```
* middleware function
```js
Ws.channel('/chat', function ({ socket }) {
  // here you go
}).middleware(async fuction(context, next) {
  ....
  await next();
})
```

### Create ControllerWs
Create controller websocket is a Chanel

```bash
  adonis make:controller <Name>
```
and select

```bash
> For Websocket channel
```
### Struct Controller Ws
* You can see controller in folder `app\Controllers\Ws`

```js
'use strict'

class LocationController {
  // constructor (ContextWs) {
  constructor ({ socket, request }) {
    console.log('constructor');
    this.socket = socket
    this.request = request
  }

  // listion event `ready`
  onReady () {
    console.log('ready');
    this.socket.toMe().emit('my:id', this.socket.socket.id)
  }

  joinRoom(ContextWs, payload) {

  }

  leaveRoom(ContextWs, payload) {

  }
}

module.exports = LocationController
```

### Structs `ContextWs`
* Structs object ContextWs

#### Attribute `socket`
- `auth` is Object AddonisSocket

##### `AddonisSocket`
- attribute `io` of socket.io
- attribute `socket` of socket.io when client connect to Chanel
- method `id` is `id` of socket
- method `rooms` get list room
- method `on` is `socket.on`
- method `to` get socket of `id` connect
- method `join` and `leave` is room
- method `disconnect` disconnect chanel

#### Attribute `auth`
- `auth` is `Adonis Auth`

#### Attribute `request`
- `request` is `Adonis request`




<br>
<br>
<br>
<br>
<hr>
In favor of active development we accept contributions from everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.

You can find a complete guide to be followed strictly before submitting your pull requests in the [Official Documentation](http://adonisjs.com/docs/contributing).
