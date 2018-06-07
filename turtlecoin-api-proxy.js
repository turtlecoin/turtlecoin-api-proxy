'use strict'

const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const util = require('util')
const Request = require('request-promise')
const bodyparser = require('body-parser')
const NodeCache = require('node-cache')
const TurtleCoind = require('turtlecoin-rpc').TurtleCoind
const BlockChainCache = require('turtlecoin-blockexplorer-cache')
const targetBlockTime = 30
const backupSeeds = [
  { host: 'nyc.turtlenode.io', port: 11898 },
  { host: 'sfo.turtlenode.io', port: 11898 },
  { host: 'ams.turtlenode.io', port: 11898 },
  { host: 'sin.turtlenode.io', port: 11898 },
  { host: 'daemon.turtle.link', port: 11898 }
]
const poolList = 'https://raw.githubusercontent.com/turtlecoin/turtlecoin-pools-json/master/turtlecoin-pools.json'

function Self (opts) {
  opts = opts || {}
  if (!(this instanceof Self)) return new Self(opts)
  this.cacheTimeout = opts.cacheTimeout || 30
  this.timeout = opts.timeout || 5000
  this.bindIp = opts.bindIp || '0.0.0.0'
  this.bindPort = opts.bindPort || 80
  this.defaultHost = opts.defaultHost || 'public.turtlenode.io'
  this.defaultPort = opts.defaultPort || 11898
  this.seeds = opts.seeds || backupSeeds
  this.pools = opts.pools || []

  // Blockchain cache database options
  this.dbCacheQueryTimeout = opts.dbCacheQueryTimeout || 20000
  this.updateInterval = opts.updateInterval || 5
  this.maxDeviance = opts.maxDeviance || 5
  this.dbEngine = opts.dbEngine || 'sqlite'
  this.dbFolder = opts.dbFolder || 'db'
  this.dbFile = opts.dbFile || 'turtlecoin'
  this.blockBatchSize = opts.blockBatchSize || 1000

  this.cache = new NodeCache({stdTTL: this.cacheTimeout, checkPeriod: (Math.round(this.cacheTimeout / 2))})
  this._setupBlockChainCache()

  this.app = express()
  this.app.use(bodyparser.json())
  this.app.use((req, res, next) => {
    res.header('X-Requested-With', '*')
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    next()
  })
  this.app.use(helmet())
  this.app.use(compression())

  this.app.get('/', (request, response) => {
    return response.status(404).send()
  })

  this.app.get('/globalHeight', (request, response) => {
    this._getGlobalHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/globalDifficulty', (request, response) => {
    this._getGlobalDifficulty().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/globalPoolHeight', (request, response) => {
    this._getGlobalPoolHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/globalPoolDifficulty', (request, response) => {
    this._getGlobalPoolDifficulty().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/pools', (request, response) => {
    return response.json(this.pools)
  })

  this.app.get('/trustedNodes', (request, response) => {
    return response.json(this.seeds)
  })

  this.app.get('/:node/getinfo', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getInfo(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/getinfo', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getInfo(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/getinfo', (request, response) => {
    this._getInfo().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/getheight', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getHeight(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/getheight', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getHeight(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/getheight', (request, response) => {
    this._getHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/getpeers', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getPeers(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/getpeers', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getPeers(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/getpeers', (request, response) => {
    this._getPeers().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/gettransactions', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getTransactions(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/:port/gettransactions', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getTransactions(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/gettransactions', (request, response) => {
    this._getTransactions().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.get('/:node/json_rpc', (request, response) => {
    // this is not even supported
    return response.status(400).send()
  })

  this.app.get('/:node/:port/json_rpc', (request, response) => {
    // this is not even supported
    return response.status(400).send()
  })

  this.app.get('/json_rpc', (request, response) => {
    // this is not even supported
    return response.status(400).send()
  })

  this.app.post('/:node/json_rpc', (request, response) => {
    this._processJsonRPC(request.body, request.params.node).then((data) => {
      return response.json({
        jsonrpc: '2.0',
        result: data
      })
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.post('/:node/:port/json_rpc', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._processJsonRPC(request.body, request.params.node, request.params.port).then((data) => {
      return response.json({
        jsonrpc: '2.0',
        result: data
      })
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  this.app.post('/json_rpc', (request, response) => {
    this._processJsonRPC(request.body).then((data) => {
      return response.json({
        jsonrpc: '2.0',
        result: data
      })
    }).catch((err) => {
      this.emit('error', err)
      return response.status(400).send()
    })
  })

  var that = this
  function getPools () {
    that._getPoolList().then((pools) => {
      that.pools = pools
    }).catch((err) => {
      that.emit('error', err)
    })
  }

  if (this.pools.length === 0) {
    getPools()
    this.poolUpdater = setInterval(getPools, (60 * 60 * 1000))
  }

  this._getGlobalHeight()
  this._getGlobalDifficulty()
  this.seedDataUpdater = setInterval(() => {
    this._getGlobalHeight()
    this._getGlobalDifficulty()
  }, ((Math.round(this.cacheTimeout / 2) * 1000)))

  this._getGlobalPoolHeight()
  this._getGlobalPoolDifficulty()
  this.poolDataUpdater = setInterval(() => {
    this._getGlobalPoolHeight()
    this._getGlobalPoolDifficulty()
  }, ((Math.round(this.cacheTimeout / 2) * 1000)))
}
inherits(Self, EventEmitter)

Self.prototype.start = function () {
  this.app.listen(this.bindPort, this.bindIp, () => {
    this.emit('ready', this.bindIp, this.bindPort)
  })
}

Self.prototype.stop = function () {
  this.app.stop()
  this.blockCache.stop()
  this.emit('stop')
}

Self.prototype._set = function (node, port, method, data, ttl) {
  ttl = ttl || this.cacheTimeout
  var key = util.format('%s%s%s', node, port, method)
  this.cache.set(key, data, ttl)
}

Self.prototype._get = function (node, port, method) {
  var key = util.format('%s%s%s', node, port, method)
  var ret = this.cache.get(key)
  if (!ret) return false
  return ret
}

/*
  Standard JSON HTTP API Commands
*/

Self.prototype._getInfo = function (node, port) {
  const rpc = new TurtleCoind({
    host: node || this.defaultHost,
    port: port || this.defaultPort
  })
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'getinfo')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    rpc.getInfo().then((data) => {
      data.cached = false
      data.node = {
        host: rpc.host,
        port: rpc.port
      }
      data.globalHashRate = Math.round(data.difficulty / targetBlockTime)
      this._set(node, port, 'getinfo', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: rpc.host, port: rpc.port}})
    })
  })
}

Self.prototype._getHeight = function (node, port) {
  const rpc = new TurtleCoind({
    host: node || this.defaultHost,
    port: port || this.defaultPort
  })
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'getheight')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    rpc.getHeight().then((data) => {
      data.cached = false
      data.node = {
        host: rpc.host,
        port: rpc.port
      }
      this._set(node, port, 'getheight', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: rpc.host, port: rpc.port}})
    })
  })
}

Self.prototype._getTransactions = function (node, port) {
  const rpc = new TurtleCoind({
    host: node || this.defaultHost,
    port: port || this.defaultPort
  })
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'gettransactions')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    rpc.getTransactions().then((data) => {
      data.cached = false
      data.node = {
        host: rpc.host,
        port: rpc.port
      }
      this._set(node, port, 'gettransactions', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: rpc.host, port: rpc.port}})
    })
  })
}

Self.prototype._getPeers = function (node, port) {
  const rpc = new TurtleCoind({
    host: node || this.defaultHost,
    port: port || this.defaultPort
  })
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'getpeers')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    rpc.getPeers().then((data) => {
      data.cached = false
      data.node = {
        host: rpc.host,
        port: rpc.port
      }
      this._set(node, port, 'getpeers', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err, node: {host: rpc.host, port: rpc.port}})
    })
  })
}

/*
  Begin JSON RPC API Commands
*/

Self.prototype._processJsonRPC = function (content, node, port) {
  node = node || this.defaultHost
  port = port || this.defaultPort

  const reject = function (reason) {
    return new Promise((resolve, reject) => {
      return reject(new Error(reason))
    })
  }

  if (!content.method) return reject('No method defined')

  try {
    switch (content.method) {
      case 'f_blocks_list_json':
        return this.getBlocks({
          host: node,
          port: port,
          height: content.params.height
        })
      case 'f_block_json':
        return this.getBlock({
          host: node,
          port: port,
          hash: content.params.hash
        })
      case 'f_transaction_json':
        return this.getTransaction({
          host: node,
          port: port,
          hash: content.params.hash
        })
      case 'getblockcount':
        return this.getBlockCount({
          host: node,
          port: port
        })
      case 'on_getblockhash':
        return this.getBlockHash({
          host: node,
          port: port,
          height: content.params[0]
        })
      case 'getlastblockheader':
        return this.getLastBlockHeader({
          host: node,
          port: port
        })
      case 'getblockheaderbyhash':
        return this.getBlockHeaderByHash({
          host: node,
          port: port,
          hash: content.params.hash
        })
      case 'getblockheaderbyheight':
        return this.getBlockHeaderByHeight({
          host: node,
          port: port,
          height: content.params.height
        })
      case 'f_on_transactions_pool_json':
        return this.getTransactionPool({
          host: node,
          port: port
        })
      case 'getblocktemplate':
        return this.getBlockTemplate({
          host: node,
          port: port,
          reserveSize: content.params.reserve_size,
          walletAddress: content.params.wallet_address
        })
      case 'submitblock':
        return this.submitBlock({
          host: node,
          port: port,
          blockBlob: content.params[0]
        })
      case 'getcurrencyid':
        return this.getCurrencyId({
          host: node,
          port: port
        })
      default:
        return this._jsonRpc({
          host: node,
          port: port,
          method: content.method,
          params: content.params
        })
    }
  } catch (e) {
    return reject(e)
  }
}

/*
  Block Explorer Functions That Check the Local Database CACHE
  before going back to the node to check for the relevant responses
*/

Self.prototype.getBlocks = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getBlocks({
      height: opts.height
    }).then((data) => {
      return resolve(data)
    }).catch(() => {
      rpc.getBlocks({
        height: opts.height
      }).then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getBlock = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getBlock({
      hash: opts.hash
    }).then((data) => {
      return resolve(data)
    }).catch(() => {
      rpc.getBlock({
        hash: opts.hash
      }).then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getTransaction({
      hash: opts.hash
    }).then((data) => {
      return resolve(data)
    }).catch(() => {
      rpc.getTransaction({
        hash: opts.hash
      }).then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getTransactionPool = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })
  return new Promise((resolve, reject) => {
    rpc.getTransactionPool().then((pool) => {
      return resolve({
        status: 'OK',
        transactions: pool
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlockCount = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })

    var networkHeight
    rpc.getBlockCount().then((height) => {
      networkHeight = height
      return this.blockCache.getBlockCount()
    }).then((block) => {
      if (Math.abs(networkHeight - block.count) > this.maxDeviance) {
        throw new Error('err')
      }
      return resolve(block)
    }).catch(() => {
      rpc.getBlockCount().then((data) => {
        return resolve({
          count: data,
          status: 'OK'
        })
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getBlockHash = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getBlockHash({
      height: opts.height
    }).then((data) => {
      return resolve(data)
    }).catch(() => {
      rpc.getBlockHash({
        height: opts.height
      }).then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getLastBlockHeader = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getLastBlockHeader().then((data) => {
      return resolve(data)
    }).catch((err) => {
      console.log(err)
      rpc.getLastBlockHeader().then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getBlockHeaderByHash = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getBlockHeaderByHash({
      hash: opts.hash
    }).then((data) => {
      return resolve(data)
    }).catch(() => {
      rpc.getBlockHeaderByHash({
        hash: opts.hash
      }).then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getBlockHeaderByHeight = function (opts) {
  return new Promise((resolve, reject) => {
    const rpc = new TurtleCoind({
      host: opts.host,
      port: opts.port
    })
    this.blockCache.getBlockHeaderByHeight({
      height: opts.height
    }).then((data) => {
      return resolve(data)
    }).catch(() => {
      rpc.getBlockHeaderByHeight({
        height: opts.height
      }).then((data) => {
        return resolve(data)
      }).catch(() => { return reject(new Error('Failure encountered')) })
    })
  })
}

Self.prototype.getCurrencyId = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })
  return new Promise((resolve, reject) => {
    rpc.getCurrencyId().then((currency) => {
      return resolve({
        currency_id_blob: currency
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlockTemplate = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })
  return rpc.getBlockTemplate({
    reserveSize: opts.reserveSize,
    walletAddress: opts.walletAddress
  })
}

Self.prototype.submitBlock = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })
  return rpc.submitBlock({
    blockBlob: opts.blockBlob
  })
}

Self.prototype._jsonRpc = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })
  return new Promise((resolve, reject) => {
    rpc._post(opts.method, opts.params).then((data) => {
      return resolve(data)
    }).catch((err) => {
      return reject(err)
    })
  })
}

/*
  Begin custom JSON HTTP API Commands
*/

Self.prototype._getGlobalHeight = function () {
  return new Promise((resolve, reject) => {
    var ttl = Math.round(targetBlockTime / 3)
    var cache = this._get('network', 'network', 'globalheight', ttl)
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    var promises = []
    for (var i = 0; i < this.seeds.length; i++) {
      var node = this.seeds[i]
      promises.push(this._getHeight(node.host, node.port))
    }
    Promise.all(promises).then((results) => {
      var heights = []
      for (var j = 0; j < results.length; j++) {
        if (!results[j].height) continue
        var height = results[j].height
        heights.push(height)
      }
      var voter = voteValue(heights)
      var data = {
        max: maxValue(heights),
        min: minValue(heights),
        avg: avgValue(heights),
        med: medValue(heights),
        cnt: results.length,
        ans: heights.length,
        con: voter.confidence,
        win: voter.value,
        cached: false
      }
      this._set('network', 'network', 'globalheight', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err})
    })
  })
}

Self.prototype._getGlobalDifficulty = function () {
  return new Promise((resolve, reject) => {
    var ttl = Math.round(targetBlockTime / 3)
    var cache = this._get('network', 'network', 'globaldifficulty', ttl)
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    var promises = []
    for (var i = 0; i < this.seeds.length; i++) {
      var node = this.seeds[i]
      promises.push(this._getInfo(node.host, node.port))
    }
    Promise.all(promises).then((results) => {
      var diffs = []
      for (var j = 0; j < results.length; j++) {
        if (!results[j].difficulty) continue
        var difficulty = results[j].difficulty
        diffs.push(difficulty)
      }
      var voter = voteValue(diffs)
      var data = {
        max: maxValue(diffs),
        min: minValue(diffs),
        avg: avgValue(diffs),
        med: medValue(diffs),
        cnt: results.length,
        ans: diffs.length,
        con: voter.confidence,
        win: voter.value,
        cached: false
      }
      this._set('network', 'network', 'globaldifficulty', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err})
    })
  })
}

Self.prototype._getGlobalPoolHeight = function () {
  return new Promise((resolve, reject) => {
    var ttl = Math.round(targetBlockTime / 3)
    var cache = this._get('pool', 'pool', 'globalpoolheight', ttl)
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    var promises = []
    for (var i = 0; i < this.pools.length; i++) {
      var node = this.pools[i]
      var url = node.url
      promises.push(this._getPoolNetworkInfo(url))
    }
    Promise.all(promises).then((results) => {
      var heights = []
      for (var j = 0; j < results.length; j++) {
        if (!results[j].height) continue
        var height = results[j].height
        heights.push(height)
      }
      var voter = voteValue(heights)
      var data = {
        max: maxValue(heights),
        min: minValue(heights),
        avg: avgValue(heights),
        med: medValue(heights),
        cnt: heights.length,
        con: voter.confidence,
        win: voter.value,
        cached: false
      }
      this._set('pool', 'pool', 'globalpoolheight', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err})
    })
  })
}

Self.prototype._getGlobalPoolDifficulty = function () {
  return new Promise((resolve, reject) => {
    var ttl = Math.round(targetBlockTime / 3)
    var cache = this._get('pool', 'pool', 'globalpooldifficulty', ttl)
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    var promises = []
    for (var i = 0; i < this.pools.length; i++) {
      var node = this.pools[i]
      var url = node.url
      promises.push(this._getPoolNetworkInfo(url))
    }
    Promise.all(promises).then((results) => {
      var diffs = []
      for (var j = 0; j < results.length; j++) {
        if (!results[j].difficulty) continue
        var difficulty = results[j].difficulty
        diffs.push(difficulty)
      }
      var voter = voteValue(diffs)
      var data = {
        max: maxValue(diffs),
        min: minValue(diffs),
        avg: avgValue(diffs),
        med: medValue(diffs),
        cnt: diffs.length,
        con: voter.confidence,
        win: voter.value,
        cached: false
      }
      this._set('pool', 'pool', 'globalpooldifficulty', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({error: err})
    })
  })
}

Self.prototype._getPoolNetworkInfo = function (url) {
  return new Promise((resolve, reject) => {
    var cache = this._get('pool', url, 'networkInfo')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }
    Request({
      method: 'GET',
      uri: url,
      json: true,
      timeout: this.timeout
    }).then((data) => {
      if (!data.network) return resolve({error: 'Invalid data returned by remote host'})
      this._set('pool', url, 'networkInfo')
      return resolve(data.network)
    }).catch((err) => {
      return resolve({error: err})
    })
  })
}

Self.prototype._getPoolList = function () {
  return new Promise((resolve, reject) => {
    var pools = []
    Request({
      method: 'GET',
      uri: poolList,
      json: true
    }).then((data) => {
      Object.keys(data).forEach((elem) => {
        pools.push({
          name: elem,
          url: util.format('%sstats', data[elem].url)
        })
      })
      return resolve(pools)
    }).catch((err) => {
      return reject(err)
    })
  })
}

// Sets up the blockchain cache database stuff

Self.prototype._setupBlockChainCache = function () {
  this.blockCacheReady = false
  this.blockCache = new BlockChainCache({
    rpcHost: this.defaultHost,
    rpcPort: this.defaultPort,
    updateInterval: this.updateInterval,
    dbEngine: this.dbEngine,
    dbFolder: this.dbFolder,
    dbFile: this.dbFile,
    timeout: this.dbCacheQueryTimeout
  })
  this.blockCache.on('error', (err) => {
    this.emit('error', util.format('[CACHE] %s', err))
  })
  this.blockCache.on('info', (info) => {
    this.emit('info', util.format('[CACHE] %s', info))
  })
  this.blockCache.on('ready', () => {
    this.blockCacheReady = true
  })
}

/*
  Helper functions
*/

function maxValue (arr) {
  return arr.reduce((a, b) => {
    return Math.max(a, b)
  })
}

function minValue (arr) {
  return arr.reduce((a, b) => {
    return Math.min(a, b)
  })
}

function avgValue (arr) {
  var sum = 0
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i]
  }
  return Math.round(sum / arr.length)
}

function medValue (arr) {
  arr.sort((a, b) => a - b)
  return (arr[(arr.length - 1) >> 1] + arr[arr.length >> 1]) / 2
}

function voteValue (arr) {
  if (arr.length === 0) return {value: 0, confidence: 1}
  var tallies = {}
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i]
    if (!tallies[val]) tallies[val] = {value: val, tally: 0}
    tallies[val].tally++
  }
  var votes = []
  for (var elem in tallies) {
    votes.push(tallies[elem])
  }
  votes = votes.sort((a, b) => b.value - a.value)
  var winner = votes[0]
  winner.confidence = winner.tally / arr.length
  return {value: winner.value, confidence: winner.confidence}
}

module.exports = Self
