// Copyright (c) 2018-2019, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const compression = require('compression')
const Crypto = require('crypto')
const express = require('express')
const helmet = require('helmet')
const EventEmitter = require('events').EventEmitter
const bodyparser = require('body-parser')
const NodeCache = require('node-cache')
const TurtleCoind = require('turtlecoin-rpc').TurtleCoind
const targetBlockTime = 30

class CacheHelper {
  constructor (timeout) {
    this.timeout = timeout || process.env.TIMEOUT
    this.cache = new NodeCache({ stdTTL: timeout || 30, checkPeriod: Math.round(timeout / 2) })
  }

  set (node, port, method, data, ttl) {
    return new Promise((resolve, reject) => {
      ttl = ttl || this.timeout
      const key = CacheHelper.sha256([node, port, method])
      this.cache.set(key, JSON.stringify(data), ttl)
      return resolve(data)
    })
  }

  get (node, port, method) {
    return new Promise((resolve, reject) => {
      const key = CacheHelper.sha256([node, port, method])
      var ret = this.cache.get(key)
      if (!ret) return resolve(false)
      ret = JSON.parse(ret)
      ret.cached = true
      return resolve(ret)
    })
  }

  static sha256 (message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message)
    }
    return Crypto.createHmac('sha256', message).digest('hex')
  }
}

class APIProxy extends EventEmitter {
  constructor (opts) {
    super()
    opts = opts || {}

    this.timeout = opts.timeout || 5000
    this.bindIp = opts.bindIp || '0.0.0.0'
    this.bindPort = opts.bindPort || 80
    this.defaultHost = opts.defaultHost || 'seed.turtlenode.io'
    this.defaultPort = opts.defaultPort || 11898

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
      res.header('Referrer-Policy', 'no-referrer')
      res.header('Content-Security-Policy', 'default-src \'none\'')
      res.header('Feature-Policy', 'geolocation none;midi none;notifications none;push none;sync-xhr none;microphone none;camera none;magnetometer none;gyroscope none;speaker self;vibrate none;fullscreen self;payment none;')
      next()
    })

    this.app.use(helmet())
    this.app.use(compression())

    this.app.get('/:node/info', (request, response) => {
      if (!request.params.node) return response.status(400).send()
      info(request.params.node, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/:port/info', (request, response) => {
      if (!request.params.node || !request.params.port) return response.status(400).send()
      info(request.params.node, request.params.port)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/info', (request, response) => {
      info(this.defaultHost, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/fee', (request, response) => {
      if (!request.params.node) return response.status(400).send()
      fee(request.params.node, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/:port/fee', (request, response) => {
      if (!request.params.node || !request.params.port) return response.status(400).send()
      fee(request.params.node, request.params.port)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/fee', (request, response) => {
      fee(this.defaultHost, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/height', (request, response) => {
      if (!request.params.node) return response.status(400).send()
      height(request.params.node, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/:port/height', (request, response) => {
      if (!request.params.node || !request.params.port) return response.status(400).send()
      height(request.params.node, request.params.port)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/height', (request, response) => {
      height(this.defaultHost, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/peers', (request, response) => {
      if (!request.params.node) return response.status(400).send()
      peers(request.params.node, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/:node/:port/peers', (request, response) => {
      if (!request.params.node || !request.params.port) return response.status(400).send()
      peers(request.params.node, request.params.port)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.get('/peers', (request, response) => {
      peers(this.defaultHost, this.defaultPort)
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.post('/:node/json_rpc', (request, response) => {
      if (!request.body || !request.body.method) return response.status(400).send()

      jsonRpc(request.params.node, this.defaultPort, request.body.method, request.body.params || [])
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.post('/:node/:port/json_rpc', (request, response) => {
      if (!request.body || !request.body.method) return response.status(400).send()

      jsonRpc(request.params.node, request.params.port, request.body.method, request.body.params || [])
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
        })
    })

    this.app.post('/json_rpc', (request, response) => {
      if (!request.body || !request.body.method) return response.status(400).send()

      jsonRpc(this.defaultHost, this.defaultPort, request.body.method, request.body.params || [])
        .then(res => { return response.json(res) })
        .catch(error => {
          this.emit('error', error.toString()); return response.status(500).send()
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

  start () {
    this.app.listen(this.bindPort, this.bindIp, () => {
      this.emit('ready', this.bindIp, this.bindPort)
    })
  }

  stop () {
    this.app.stop()
    this.emit('stop')
  }
}

const cache = new CacheHelper()

function rpc (host, port) {
  return new TurtleCoind({ host, port })
}

function info (host, port) {
  return cache.get(host, port, 'info')
    .then(response => {
      if (response) return response
      return rpc(host, port).info()
    })
    .then(response => {
      response.node = { host, port }
      response.globalHashRate = Math.round(response.difficulty / targetBlockTime)
      if (!response.cached) return cache.set(host, port, 'info', response)
      return response
    })
}

function fee (host, port) {
  return cache.get(host, port, 'fee')
    .then(response => {
      if (response) return response
      return rpc(host, port).fee()
    })
    .then(response => {
      response.node = { host, port }
      if (!response.cached) return cache.set(host, port, 'fee', response)
      return response
    })
}

function height (host, port) {
  return cache.get(host, port, 'height')
    .then(response => {
      if (response) return response
      return rpc(host, port).height()
    })
    .then(response => {
      response.node = { host, port }
      if (!response.cached) return cache.set(host, port, 'height', response)
      return response
    })
}

function peers (host, port) {
  return cache.get(host, port, 'peers')
    .then(response => {
      if (response) return response
      return rpc(host, port).peers()
    })
    .then(response => {
      response.node = { host, port }
      if (!response.cached) return cache.set(host, port, 'peers', response)
      return response
    })
}

function jsonRpc (host, port, method, payload) {
  return cache.get(host, port, ['jsonRpc', method, payload])
    .then(response => {
      if (response) return response
      return handleJson(host, port, method, payload)
    })
    .then(response => {
      response.node = { host, port }
      if (!response.cached) return cache.set(host, port, ['jsonRpc', method, payload], response)
      return response
    })
}

function handleJson (host, port, method, payload) {
  return rpc(host, port)
    ._post(method, payload)
}

module.exports = APIProxy
