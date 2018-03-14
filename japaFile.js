'use strict'

/**
 * Enable it, since some tests rely on debug
 * statements
 *
 * @type {String}
 */
process.env.DEBUG = 'adonis:websocket'
process.env.DEBUG_COLORS = false
process.env.DEBUG_HIDE_DATE = true

const cli = require('japa/cli')
cli.run('test/**/*.spec.js')
