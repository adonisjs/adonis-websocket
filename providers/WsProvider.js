'use strict'

const ServiceProvider = require('adonis-fold').ServiceProvider

class WsProvider extends ServiceProvider {

  * register () {
    this.app.singleton('Adonis/Addons/Ws', (app) => {
      const Ws = require('../src/Ws')
      const Config = app.use('Adonis/Src/Config')
      const Request = app.use('Adonis/Src/Request')
      const Server = app.use('Adonis/Src/Server')
      const Session = app.use('Adonis/Src/Session')
      return new Ws(Config, Request, Server, Session)
    })
  }

}

module.exports = WsProvider
