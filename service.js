// Copyright (c) 2018-2019, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

require('colors')
const TurtleCoinAPI = require('./')
const util = require('util')

var server = new TurtleCoinAPI({
})

function log (message) {
  console.log(util.format('%s: %s', (new Date()).toUTCString(), message))
}

server.on('error', (err) => {
  log(err.red)
})

server.on('ready', (ip, port) => {
  log(util.format('Server is listening on %s:%s...', ip, port).green)
})

server.on('info', (info) => {
  log(info.green)
})

server.start()
