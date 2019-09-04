// Copyright (c) 2018-2019, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const util = require('util')
const bodyparser = require('body-parser')
const NodeCache = require('node-cache')
const TurtleCoind = require('turtlecoin-rpc').TurtleCoind
const targetBlockTime = 30

function APIProxy (opts) {
  opts = opts || {}
  if (!(this instanceof APIProxy)) return new APIProxy(opts)
  this.cacheTimeout = opts.cacheTimeout || 30
  this.timeout = opts.timeout || 5000
  this.bindIp = opts.bindIp || '0.0.0.0'
  this.bindPort = opts.bindPort || 80
  this.defaultHost = opts.defaultHost || 'seed.turtlenode.io'
  this.defaultPort = opts.defaultPort || 11898

  this.cache = new NodeCache({ stdTTL: this.cacheTimeout, checkPeriod: (Math.round(this.cacheTimeout / 2)) })

  this.app = express()
  this.app.use(bodyparser.json())
  this.app.use((err, req, res, next) => {
    if (err instanceof SyntaxError) {
      return res.status(400).send()
    }
    next()
  })
  this.app.use((req, res, next) => {
    res.header('X-Requested-With', '*')
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.header('Cache-Control', 'max-age=30, public')
    next()
  })
  this.app.use(helmet())
  this.app.use(compression())

  this.app.get('/:node/info', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getInfo(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/info', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getInfo(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/info', (request, response) => {
    this._getInfo().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/fee', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._feeInfo(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/fee', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._feeInfo(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/fee', (request, response) => {
    this._feeInfo().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/height', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getHeight(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/height', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getHeight(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/height', (request, response) => {
    this._getHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/peers', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getPeers(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/peers', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getPeers(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/peers', (request, response) => {
    this._getPeers().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/getinfo', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getInfo(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/getinfo', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getInfo(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/getinfo', (request, response) => {
    this._getInfo().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/feeinfo', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._feeInfo(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/feeinfo', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._feeInfo(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/feeinfo', (request, response) => {
    this._feeInfo().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/getheight', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getHeight(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/getheight', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getHeight(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/getheight', (request, response) => {
    this._getHeight().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/getpeers', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getPeers(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/getpeers', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getPeers(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/getpeers', (request, response) => {
    this._getPeers().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/gettransactions', (request, response) => {
    if (!request.params.node) return response.status(400).send()
    this._getTransactions(request.params.node).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/:node/:port/gettransactions', (request, response) => {
    if (!request.params.node || !request.params.port) return response.status(400).send()
    this._getTransactions(request.params.node, request.params.port).then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
    })
  })

  this.app.get('/gettransactions', (request, response) => {
    this._getTransactions().then((data) => {
      return response.json(data)
    }).catch((err) => {
      this.emit('error', err)
      return response.status(500).send()
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
      return response.status(500).send()
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
      return response.status(500).send()
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
      return response.status(500).send()
    })
  })

  /* Response to options requests for preflights */
  this.app.options('*', (req, res) => {
    return res.status(200).send()
  })

  /* This is our catch all to return a 404-error */
  this.app.all('*', (req, res) => {
    return res.status(404).send()
  })
}
inherits(APIProxy, EventEmitter)

APIProxy.prototype.start = function () {
  this.app.listen(this.bindPort, this.bindIp, () => {
    this.emit('ready', this.bindIp, this.bindPort)
  })
}

APIProxy.prototype.stop = function () {
  this.app.stop()
  this.emit('stop')
}

APIProxy.prototype._set = function (node, port, method, data, ttl) {
  ttl = ttl || this.cacheTimeout
  var key = util.format('%s%s%s', node, port, method)
  this.cache.set(key, data, ttl)
}

APIProxy.prototype._get = function (node, port, method) {
  var key = util.format('%s%s%s', node, port, method)
  var ret = this.cache.get(key)
  if (!ret) return false
  return ret
}

/*
  Standard JSON HTTP API Commands
*/

APIProxy.prototype._getInfo = function (node, port) {
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
      return resolve({ error: err, node: { host: rpc.host, port: rpc.port } })
    })
  })
}

APIProxy.prototype._feeInfo = function (node, port) {
  const rpc = new TurtleCoind({
    host: node || this.defaultHost,
    port: port || this.defaultPort
  })
  return new Promise((resolve, reject) => {
    var cache = this._get(node, port, 'feeinfo')
    if (cache) {
      cache.cached = true
      return resolve(cache)
    }

    rpc.feeInfo().then((data) => {
      data.cached = false
      data.node = {
        host: rpc.host,
        port: rpc.port
      }
      this._set(node, port, 'feeinfo', data)
      return resolve(data)
    }).catch((err) => {
      return resolve({ error: err, node: { host: rpc.host, port: rpc.port } })
    })
  })
}

APIProxy.prototype._getHeight = function (node, port) {
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
      return resolve({ error: err, node: { host: rpc.host, port: rpc.port } })
    })
  })
}

APIProxy.prototype._getTransactions = function (node, port) {
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
      return resolve({ error: err, node: { host: rpc.host, port: rpc.port } })
    })
  })
}

APIProxy.prototype._getPeers = function (node, port) {
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
      return resolve({ error: err, node: { host: rpc.host, port: rpc.port } })
    })
  })
}

/*
  Begin JSON RPC API Commands
*/

APIProxy.prototype._processJsonRPC = function (content, node, port) {
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
      case 'f_gettransactionsbypaymentid':
        return this.getTransactionHashesByPaymentId({
          host: node,
          port: port,
          paymentId: content.params.paymentId
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

APIProxy.prototype.getBlocks = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getBlocks({
    height: opts.height
  })
}

APIProxy.prototype.getBlock = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getBlock({
    hash: opts.hash
  })
}

APIProxy.prototype.getTransaction = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getTransaction({
    hash: opts.hash
  })
}

APIProxy.prototype.getTransactionPool = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return new Promise((resolve, reject) => {
    rpc.getTransactionPool()
      .then(pool => { return resolve({ stats: 'OK', transactions: pool }) })
      .catch(error => { return reject(error) })
  })
}

APIProxy.prototype.getBlockCount = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return new Promise((resolve, reject) => {
    rpc.getBlockCount()
      .then(response => { return resolve({ count: response, status: 'OK' }) })
      .catch(error => { return reject(error) })
  })
}

APIProxy.prototype.getBlockHash = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getBlockHash({
    height: opts.height
  })
}

APIProxy.prototype.getLastBlockHeader = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getLastBlockHeader()
}

APIProxy.prototype.getBlockHeaderByHash = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getBlockHeaderByHash({
    hash: opts.hash
  })
}

APIProxy.prototype.getBlockHeaderByHeight = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getBlockHeaderByHeight({
    height: opts.height
  })
}

APIProxy.prototype.getCurrencyId = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return new Promise((resolve, reject) => {
    rpc.getCurrencyId()
      .then(response => { return resolve({ currency_id_blob: response }) })
      .catch(error => { return reject(error) })
  })
}

APIProxy.prototype.getBlockTemplate = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.getBlockTemplate({
    reserveSize: opts.reserveSize,
    walletAddress: opts.walletAddress
  })
}

APIProxy.prototype.submitBlock = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc.submitBlock({
    blockBlob: opts.blockBlob
  })
}

APIProxy.prototype._jsonRpc = function (opts) {
  const rpc = new TurtleCoind({
    host: opts.host,
    port: opts.port
  })

  return rpc._post(opts.method, opts.params)
}

module.exports = APIProxy
