'use strict'

/*
 * adonis-websocket
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')

class Presence {

  constructor (io) {
    this.io = io
    this._users = {}
  }

  /**
   * Track sockets for a given user.
   *
   * @param {Object} socket
   * @param {Number} user
   * @param {Object} [meta]
   */
  track (socket, user, meta) {
    meta = meta || null
    const self = this
    const payload = {
      user, socket, meta
    }

    /**
     * Remove the tracked payload from the list when a
     * socket disconnects
     */
    payload.socket.on('disconnect', function () {
      self.pull(this.user, (item) => item.socket.id === this.socket.id)
      self.publishPresence()
    }.bind(payload))

    this._users[user] = this._users[user] || []
    this._users[user].push(payload)
    this.publishPresence()
  }

  /**
   * Get socket details for a given user.
   *
   * @param  {Number|String} userId
   *
   * @return {Array}
   */
  get (userId) {
    return this._users[userId]
  }

  /**
   * Publish the presence to all the connected clients on
   * a given channel.
   */
  publishPresence () {
    const publishPayload = _.map(this._users, (details) => {
      return _.transform(details, (result, item) => {
        result.id = result.id || item.user // MAKING SURE WE ARE NOT MUTATING IT EVERTIME
        result.payload.push({
          socketId: item.socket.id,
          meta: item.meta
        })
        return result
      }, {payload: []})
    })
    this.io.emit('presence:state', publishPayload)
  }

  /**
   * All and remove sockets for a given user based
   * upon the matches returned by cb
   *
   * @param {String|Number} userId
   * @param {Function} cb
   *
   * @return {Array}
   */
  pull (userId, cb) {
    const sockets = this.get(userId)
    return sockets ? _.remove(sockets, cb) : []
  }
}

module.exports = Presence
