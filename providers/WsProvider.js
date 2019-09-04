'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('@adonisjs/fold')

class WsProvider extends ServiceProvider {
  /**
   * Register the Ws provider
   *
   * @method _registerWs
   *
   * @return {void}
   *
   * @private
   */
  _registerWs () {
    this.app.singleton('Adonis/Addons/Ws', function (app) {
      const Ws = require('../src/Ws')
      return new Ws(app.use('Adonis/Src/Config'))
    })
    this.app.alias('Adonis/Addons/Ws', 'Ws')
  }

  /**
   * Register the Ws context
   *
   * @method _registerWsContext
   *
   * @return {void}
   *
   * @private
   */
  _registerWsContext () {
    this.app.bind('Adonis/Addons/WsContext', function (app) {
      return require('../src/Context')
    })
    this.app.alias('Adonis/Addons/WsContext', 'WsContext')
  }

  /**
   * Register all required providers
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this._registerWs()
    this._registerWsContext()
  }

  /**
   * Add request getter to the WsContext
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    const WsContext = this.app.use('Adonis/Addons/WsContext')
    const Request = this.app.use('Adonis/Src/Request')
    const Config = this.app.use('Adonis/Src/Config')

    WsContext.getter('request', function () {
      const request = new Request(this.req, {}, Config)
      request.websocket = true
      return request
    }, true)
  }
}

module.exports = WsProvider
