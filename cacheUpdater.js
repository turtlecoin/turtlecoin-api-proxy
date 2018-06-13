'use strict'

const BlockChainCache = require('turtlecoin-blockexplorer-cache')
const util = require('util')

function log (message) {
  console.log(util.format('%s: %s', (new Date()).toUTCString(), message))
}

var blockCache = new BlockChainCache({
  rpcHost: 'public.turtlenode.io',
  rpcPort: 11898,
  dbEngine: 'sqlite',
  dbFolder: 'db',
  dbFile: 'turtlecoin',
  autoStartUpdater: true
})

blockCache.on('error', (err) => {
  log(util.format('[CACHE] %s', err))
})

blockCache.on('info', (info) => {
  log(util.format('[CACHE] %s', info))
})
