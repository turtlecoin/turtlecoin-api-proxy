# TurtleCoind Node API Proxy


This project is designed to provide an API proxy for web services to contact any number of TurtleCoin nodes for basic information regarding the state of the Node. It utilizes a cache that helps speed up the delivery of responses to clients while minimizing the load against the daemon by remote callers.

The sample **service.js** includes an example of how to quickly spin up the web service. It supports clustering via PM2 and I ***highly*** recommend that you run it with multiple threads.

## Dependencies

* NodeJS v8.x

## Easy Start

This will spin up a copy of the webservice on 0.0.0.0:80. See the additional options below to customize the port or IP the web service binds to.

```bash
git clone https://github.com/brandonlehmann/turtlecoin-api-proxy.git
cd turtlecoin-api-proxy
npm i
node service.js
```

## Keep it Running

I'm a big fan of PM2 so if you don't have it installed, the setup is quite simple.

```bash
npm install -g pm2
pm2 startup
pm2 install pm2-logrotate
pm2 start service.js --watch --name turtlecoin-api-proxy -i max
pm2 start cacheUpdater.js --name turtlecoin-api-proxy-cache
pm2 save
```

## Initialization

This is incredibly simple to setup and use. No options are required but you can customize it as you see fit. Default values are provided below.

```javascript
const TRTLProxy = require('./')

var service = new TRTLProxy({
  cacheTimeout: 30, // How quickly do we timeout cached responses from individual nodes
  timeout: 2000, // How long to wait for underlying RPC calls to return
  bindIp: '0.0.0.0', // What IP address do we bind the web service to
  bindPort: 80 // What port do we bind the web service to
  defaultHost: 'public.turtlenode.io', // The default node to look to for RPC calls
  defaultPort: 11898, // The default port to use on the default node
  seeds: [], // Nodes that we want to pre-cache information from
  pools: [], // The pools we want to return data for, if none are supplied look to the official TurtleCoin list on the repos
  
  // Blockchain database cache options
  autoStartUpdater: false, // Whether we auto start the blockchain database cache
  dbCacheQueryTimeout: 20000, // How long should the database cache updated wait for a RPC response
  updateInterval: 5, // How long, in seconds, that we pause for before checking for new blocks when we're synced up or we finish scanning a batch
  dbEngine: 'sqlite', // What database engine to use, see below for additional detais.
  dbFolder: 'db', // What folder to use to store the database file, only valid for some database engines
  dbFile: 'turtlecoin', // The filename to use to store the database file, only valid for some database engines
})
```

## Methods


### service.start()

Starts the web service

```javascript
service.start()
```

### service.stop()

Stops the web service

```javascript
service.stop()
```

## Events

### Event - ***error***

Event is emitted when an error is encountered.

```javascript
service.on('error', (err) => {
  // do something
})
```

### Event - ***ready***

Event is emitted when the web service is listening for connections.

```javascript
service.on('ready', (ip, port) => {
  // do something
})
```

### Event - ***stop***

Event is emitted when the web service is stopped.

```javascript
service.on('stop', () => {
  // do something
})
```

## Using the API

Refer to the [TurtleCoin](https://turtlecoin.lol) documentation for the API commands supported. Generally speaking, all commands from the JSON HTTP API and JSON RPC API are supported.

### Querying Multiple Nodes

To query a node other than the one supplied in ```defaultHost``` call any of the API commands in one of the following formats:

* /endpoint
* /:node:/endpoint
* /:node:/:port:/endpoint

Examples:

* /getinfo
* /public.turtlenode.io/getinfo
* /public.turtlenode.io/11898/getinfo
* /json_rpc
* /public.turtlenode.io/json_rpc
* /public.turtlenode.io/11898/json_rpc

### Additional API Methods

#### /pools

You will receive a JSON response of pools like such below. By default this serves the pool list from https://raw.githubusercontent.com/turtlecoin/turtlecoin-pools-json/master/turtlecoin-pools.json

```javascript
[
  {
    "name": "atpool.party",
    "url": "http://turtle-eu.atpool.party:8117/stats"
  },
  {
    "name": "auspool.turtleco.in",
    "url": "http://auspool.turtleco.in/api/stats"
  }
]
```

#### /trustedNodes

You will receive a JSON response of trusted nodes like such below. 
This is in reference to the new opts.seeds used during initialization as these are the nodes we "trust".

```javascript
[
  {
    "host": "nyc.turtlenode.io",
    "port": 11898
  },
  {
    "host": "sfo.turtlenode.io",
    "port": 11898
  },
  {
    "host": "ams.turtlenode.io",
    "port": 11898
  },
  {
    "host": "sin.turtlenode.io",
    "port": 11898
  },
  {
    "host": "daemon.turtle.link",
    "port": 11898
  }
]
```

#### /globalHeight

You will receive a JSON response of height information as gathered from the trusted Nodes.

```javascript
{
  "max": 319932,
  "min": 319835,
  "avg": 319908,
  "med": 319932,
  "cnt": 5,
  "ans": 4,
  "con": 0.75,
  "win": 319932,
  "cached": true
}
```

#### /globalPoolHeight

You will receive a JSON response of height information as gathered from the pools.

```javascript
{
  "max": 319934,
  "min": 311319,
  "avg": 318795,
  "med": 319934,
  "cnt": 13,
  "con": 0.6923076923076923,
  "win": 319934,
  "cached": true
}
```

#### /globalDifficulty

You will receive a JSON response of difficulty information as gathered from the trusted Nodes.

```javascript
{
  "max": 303926695,
  "min": 54848952,
  "avg": 241657259,
  "med": 303926695,
  "cnt": 5,
  "ans": 4,
  "con": 0.75,
  "win": 303926695,
  "cached": false
}
```

#### /globalPoolDifficulty

You will receive a JSON response of difficulty information as gathered from the pools.

```javascript
{
  "max": 303926695,
  "min": 14439,
  "avg": 242315265,
  "med": 303926695,
  "cnt": 14,
  "con": 0.7142857142857143,
  "win": 303926695,
  "cached": false
}
```

## License

```
Copyright (C) 2018 Brandon Lehmann, The TurtleCoin Developers

Please see the included LICENSE file for more information.
```