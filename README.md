TurtleCoind Node API Proxy
===

This project is designed to provide an API proxy for web services to contact any number of TurtleCoin nodes for basic information regarding the state of the Node. It utilizes a cache that helps speed up the delivery of responses to clients while minimzing the load against the daemon by remote callers.

The sample **service.js** includes an example of how to quickly spin up the web service. It supports clustering via PM2 and I ***highly*** recommend that you run it with multiple threads.

Dependencies
=

* NodeJS v8.x

Easy Start
=

This will spin up a copy of the webservice on 0.0.0.0:80. See the additional options below to customize the port or IP the web service binds to.

```bash
git clone 
cd turtlecoin-api-proxy
npm i
node service.js
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

