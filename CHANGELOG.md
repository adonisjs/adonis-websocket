<a name="1.0.4"></a>
## [1.0.4](https://github.com/adonisjs/adonis-websocket/compare/v1.0.3...v1.0.4) (2017-03-29)


### Bug Fixes

* **package:** update uws to version 0.14.0 ([#9](https://github.com/adonisjs/adonis-websocket/issues/9)) ([8820145](https://github.com/adonisjs/adonis-websocket/commit/8820145))



<a name="1.0.3"></a>
## [1.0.3](https://github.com/adonisjs/adonis-websocket/compare/v1.0.2...v1.0.3) (2017-02-25)


### Bug Fixes

* **links:** broken links for official docs ([2e0a5a0](https://github.com/adonisjs/adonis-websocket/commit/2e0a5a0))
* **package:** update uws to version 0.13.0 ([#4](https://github.com/adonisjs/adonis-websocket/issues/4)) ([b320cf4](https://github.com/adonisjs/adonis-websocket/commit/b320cf4))
* **ws:** make use of uws only when defined in config file ([4b8dc43](https://github.com/adonisjs/adonis-websocket/commit/4b8dc43)), closes [#3](https://github.com/adonisjs/adonis-websocket/issues/3)



<a name="1.0.2"></a>
## [1.0.2](https://github.com/adonisjs/adonis-websocket/compare/v1.0.1...v1.0.2) (2016-12-16)


### Bug Fixes

* **channel:** fix emit to everyone ([589b23f](https://github.com/adonisjs/adonis-websocket/commit/589b23f))


### Features

* **presence:** add support for tracking sockets ([ebd9cae](https://github.com/adonisjs/adonis-websocket/commit/ebd9cae))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/adonisjs/adonis-websocket/compare/v1.0.0...v1.0.1) (2016-12-12)


### Bug Fixes

* **socket:** use nsp syntax to broadcast messages ([3d0e868](https://github.com/adonisjs/adonis-websocket/commit/3d0e868))



<a name="1.0.0"></a>
# 1.0.0 (2016-12-08)


### Bug Fixes

* **ws:** rename method to named instead of set ([d7e7a1d](https://github.com/adonisjs/adonis-websocket/commit/d7e7a1d))


### Features

* initial commit ([54ed155](https://github.com/adonisjs/adonis-websocket/commit/54ed155))
* **broadcast:** send room on emit to room,improve emit scope ([eff8ff1](https://github.com/adonisjs/adonis-websocket/commit/eff8ff1))
* **channel:** implement channel/rooms ([70e3af4](https://github.com/adonisjs/adonis-websocket/commit/70e3af4))
* **channel:** resolve controller from Ioc ([05e9170](https://github.com/adonisjs/adonis-websocket/commit/05e9170))
* **exceptions:** add custom exceptions ([5177445](https://github.com/adonisjs/adonis-websocket/commit/5177445))
* **middleware:** add middleware support ([9f14282](https://github.com/adonisjs/adonis-websocket/commit/9f14282))
* **session:** add support for session in handshake ([0018672](https://github.com/adonisjs/adonis-websocket/commit/0018672))


### Performance Improvements

* **uws:** make use of uws as the core engine ([72fe501](https://github.com/adonisjs/adonis-websocket/commit/72fe501))
