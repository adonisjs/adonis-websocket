'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

class Resetable {
  constructor (defaultValue) {
    this._defaultValue = defaultValue
    this.set(defaultValue)
  }

  set (val) {
    this._val = val
  }

  get () {
    return this._val
  }

  clear () {
    this.set(this._defaultValue)
  }

  pull () {
    return ((val) => {
      this.clear()
      return val
    })(this.get())
  }
}

module.exports = Resetable
