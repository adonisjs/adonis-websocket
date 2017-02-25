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
Adonis Websocket is the official **websockets** provider for AdonisJs. It let you easily setup/authenticate channels and rooms with elegant syntax and power of ES2015 generators.:rocket:

<br>
<hr>
<br>

## Table of Contents

* [Setup](#setup)
* [Getting Started](#getting-started)
* [Contribution Guidelines](#contribution-guidelines)

<br>
## <a name="requirements"></a>Setup
Follow the below instructions to setup this provider

### Install
```bash
npm i --save adonis-websocket
```

### Setting up the provider
All providers are registered inside `bootstrap/app.js` file.

```javascript
const providers = [
  'adonis-websocket/providers/WsProvider'
]
```

### Setting up the alias
Aliases makes it easier to reference a namespace with a short unique name. Aliases are also registered inside `bootstrap/app.js` file.

```javascript
const aliases = {
  Ws: 'Adonis/Addons/Ws'
}
```

Setup process is done. Let's use the **Ws** provider now.

<br>
## <a name="getting-started"></a>Getting Started

Feel free to skip this section and read the [official documentation](http://adonisjs.com/docs/websocket), if you are on version `3.2` or later.

If you are using older version of `adonis-app`. You are supposed to create couple of directories in order to setup the ecosystem.

### Bash Commands
Below are the bash commands to create required directories. Equivalent commands for windows can be used.

```bash
mkdir app/Ws
mkdir app/Ws/Controllers
touch app/Ws/socket.js
```

### Loading socket.js file.
Next we need to do is loading the `socket.js` file when starting the server. Which will be inside `bootstrap/http.js` file. Paste the below line of code after `use(Helpers.makeNameSpace('Http', 'routes'))`

```javascript
use(Helpers.makeNameSpace('Ws', 'socket'))
```

Next, read the [official documentation](http://adonisjs.com/docs/websocket) :book:

<br>
## <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions from everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.

You can find a complete guide to be followed strictly before submitting your pull requests in the [Official Documentation](http://adonisjs.com/docs/contributing).
