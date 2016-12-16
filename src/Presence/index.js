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
    this._usersPool = {}
  }

  /**
   * Track sockets for a given user.
   *
   * @param {Object} socket
   * @param {Number} user
   * @param {Object} [meta]
   */
  track (socket, userId, meta) {
    meta = meta || null
    const self = this
    const payload = {
      userId, socket, meta
    }

    /**
     * Remove the tracked payload from the list when a
     * socket disconnects
     */
    payload.socket.on('disconnect', function () {
      self.pull(this.userId, (user) => user.socket.id === this.socket.id)
      self.publishPresence()
    }.bind(payload))

    this._usersPool[userId] = this._usersPool[userId] || []
    this._usersPool[userId].push(payload)
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
    return this._usersPool[userId]
  }

  /**
   * Publish the presence to all the connected clients on
   * a given channel.
   */
  publishPresence () {
    const publishPayload = _.map(this._usersPool, (users) => {
      return _.transform(users, (result, user) => {
        result.id = result.id || user.userId // MAKING SURE WE ARE NOT MUTATING IT EVERTIME
        result.payload.push({
          socketId: user.socket.id,
          meta: user.meta
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
    if (!sockets) {
      return []
    }
    const removedSockets = _.remove(sockets, cb)
    if (_.size(this.get(userId)) === 0) {
      delete this._usersPool[userId]
    }
    return removedSockets
  }
}

module.exports = Presence
