'use strict'

/**
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const fold = require('@adonisjs/fold')
const { Helpers } = require('@adonisjs/sink')

module.exports = async () => {
  process.env.ENV_SILENT = true

  fold.ioc.singleton('Adonis/Src/Helpers', () => {
    return new Helpers(__dirname)
  })

  fold.registrar.providers([
    '@adonisjs/framework/providers/AppProvider',
    path.join(__dirname, '..', '..', 'providers', 'WsProvider')
  ])

  await fold.registrar.registerAndBoot()
}
