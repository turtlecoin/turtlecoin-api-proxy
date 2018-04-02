TurtleCoind Node API Proxy
===

This project is designed to provide an API proxy for web services to contact any number of TurtleCoin nodes for basic information regarding the state of the Node. It utilizes a cache that helps speed up the delivery of responses to clients while minimizing the load against the daemon by remote callers.

The sample **service.js** includes an example of how to quickly spin up the web service. It supports clustering via PM2 and I ***highly*** recommend that you run it with multiple threads.

Dependencies
=

* NodeJS v8.x

Easy Start
=

This will spin up a copy of the webservice on 0.0.0.0:80. See the additional options below to customize the port or IP the web service binds to.

```bash
git clone https://github.com/brandonlehmann/turtlecoin-api-proxy.git
cd turtlecoin-api-proxy
npm i
node service.js
```

Using the API
=

/getinfo
==

You may call the URL using any of the following paths.

* /getinfo
* /1.1.1.1/getinfo
* /1.1.1.1/11898/getinfo

You will receive a JSON response as shown below.

```javascript
{
    "alt_blocks_count": 34,
    "difficulty": 194403128,
    "grey_peerlist_size": 4199,
    "height": 270523,
    "incoming_connections_count": 30,
    "last_known_block_index": 270520,
    "outgoing_connections_count": 8,
    "status": "OK",
    "tx_count": 264219,
    "tx_pool_size": 0,
    "white_peerlist_size": 333,
    "cached": false,
    "node": {
    "host": "public.turtlenode.io",
    "port": 11898
    },
    "globalHashRate": 6480104
}
```

/getheight
==

You may call the URL using any of the following paths.

* /getheight
* /1.1.1.1/getheight
* /1.1.1.1/11898/getheight

You will receive a JSON response as shown below.

```javascript
{
    "height": 270524,
    "status": "OK",
    "cached": false,
    "node": {
        "host": "public.turtlenode.io",
        "port": 11898
    }
}
```

/gettransactions
==

You may call the URL using any of the following paths.

* /gettransactions
* /1.1.1.1/gettransactions
* /1.1.1.1/11898/gettransactions

You will receive a JSON response as shown below.

```javascript
{
    "missed_tx": [],
    "status": "OK",
    "txs_as_hex": [],
    "cached": false,
    "node": {
        "host": "public.turtlenode.io",
        "port": 11898
    }
}
```

/json_rpc
==

You may call the POST to the URL using any of the following paths.

* /json_rpc
* /1.1.1.1/json_rpc
* /1.1.1.1/11898/json_rpc

These will respond back as if you made the same requests directly to the node. For full documentation of what's supported, see the TurtleCoin documentation.

/pools
==

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

/trustedNodes
==

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

/globalHeight
==

You will receive a JSON response of height information as gathered from the trusted Nodes.

```javascript
{
  "max": 289766,
  "min": 289766,
  "avg": 289766,
  "cnt": 5,
  "cached": true
}
```

/globalPoolHeight
==

You will receive a JSON response of height information as gathered from the pools.

```javascript
{
  "max": 289766,
  "min": 289766,
  "avg": 289766,
  "cnt": 15,
  "cached": true
}
```

/globalDifficulty
==

You will receive a JSON response of difficulty information as gathered from the trusted Nodes.

```javascript
{
  "max": 162972002,
  "min": 162972002,
  "avg": 162972002,
  "cnt": 5,
  "cached": true
}
```

/globalPoolDifficulty
==

You will receive a JSON response of difficulty information as gathered from the pools.

```javascript
{
  "max": 180308261,
  "min": 180308261,
  "avg": 180308261,
  "cnt": 14,
  "cached": false
}
```

Keep it Running
=

I'm a big fan of PM2 so if you don't have it installed, the setup is quite simple.

```bash
npm install -g pm2
pm2 startup
pm2 install pm2-logrotate
pm2 start service.js --watch --name turtlecoin-api-proxy -i max
pm2 save
```

Documentation
=

Initialization
==

This is incredibly simple to setup and use. No options are required but you can customize it as you see fit. Default values are provided below.

```javascript
const TRTLProxy = require('./')

var service = new TRTLProxy({
  cacheTimeout: 30, // How quickly do we timeout cached responses from individual nodes
  bindIp: '0.0.0.0', // What IP address do we bind the web service to
  bindPort: 80 // What port do we bind the web service to
})
```
Methods
==

service.start()
===

Starts the web service

```javascript
service.start()
```

service.stop()
===

Stops the web service

```javascript
service.stop()
```

Events
==

Event - ***ready***
===

Event is emitted when the web service is listening for connections.

```javascript
service.on('ready', (ip, port) => {
  // do something
})
```

Event - ***stop***
===

Event is emitted when the web service is stopped.

```javascript
service.on('stop', () => {
  // do something
})
```

Event - ***error***
===

Event is emitted when an error is encountered.

```javascript
service.on('error', (err) => {
  // do something
})
```

