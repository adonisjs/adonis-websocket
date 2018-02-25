'use strict'

const url = require('url')
const querystring = require('querystring')

class Request {
  constructor (req, res) {
    if (!req || !res) {
      throw new Error('req and res are required')
    }
    this.request = req
    this.response = res
  }

  input (key) {
    const query = url.parse(this.request.url).search
    if (!query) {
      return null
    }
    return querystring.parse(query.replace(/^\?/, ''))[key]
  }
}

module.exports = Request
