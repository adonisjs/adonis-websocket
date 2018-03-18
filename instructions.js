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

async function copySocketFile (cli) {
  const inFile = path.join(__dirname, 'config', 'socket.js')
  const outFile = path.join(cli.helpers.appRoot(), 'start/socket.js')
  await cli.copy(inFile, outFile)
  cli.command.completed('create', 'start/socket.js')
}

async function copyKernelFile (cli) {
  const inFile = path.join(__dirname, 'config', 'wsKernel.js')
  const outFile = path.join(cli.helpers.appRoot(), 'start/wsKernel.js')
  await cli.copy(inFile, outFile)
  cli.command.completed('create', 'start/wsKernel.js')
}

async function copyConfigFile (cli) {
  const inFile = path.join(__dirname, 'config', 'index.js')
  const outFile = path.join(cli.helpers.configPath(), 'socket.js')
  await cli.copy(inFile, outFile)
  cli.command.completed('create', 'config/socket.js')
}

module.exports = async (cli) => {
  try {
    await copySocketFile(cli)
    await copyConfigFile(cli)
    await copyKernelFile(cli)
  } catch (error) {
    // ignore error
  }
}
