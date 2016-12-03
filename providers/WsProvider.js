'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class WsProvider extends ServiceProvider {

  * register () {
    this.app.singleton('Adonis/Addons/Ws', (app) => {
      const Ws = require('../src/Ws')
      const Config = app.use('Adonis/Src/Config')
      const Request = app.use('Adonis/Src/Request')
      const Server = app.use('Adonis/Src/Server')
      const Session = app.use('Adonis/Src/Session')
      const Helpers = app.use('Adonis/Src/Helpers')
      return new Ws(Config, Request, Server, Session, Helpers)
    })
  }

}

module.exports = WsProvider
