'use strict'

const ServiceProvider = require('adonis-fold').ServiceProvider

class WsProvider extends ServiceProvider {

  * register () {
    this.app.singleton('Adonis/Addons/Channel', function (app) {
      return require('../src/Channel')
    })
  }

}

module.exports = WsProvider
