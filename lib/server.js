/*
 * Server-related tasks
 *
 */

// Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
// this to allow logging in debug mode
const util = require('util');
// here workers is the name to be passed to NODE_DEBUG env letiable before run
// e.g. NODE_DEBUG=server,http node index.js
const debug = util.debuglog('server');

// Instantiate the server module object
let server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

// All the server logic
server.unifiedServer = function(req, res) {
  // Get the URL and parse it,
  // second arg is true to use querystring module to parse url
  let parsedUrl = url.parse(req.url, true);

  // Get the path
  let path = parsedUrl.pathname;
  // Replace trimming slashes
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  let queryStringObject  = parsedUrl.query;

  // Get the HTTP method
  let method = req.method.toLowerCase();

  // Get the headers as an object
  let headers = req.headers;

  // Get the payload, if any
  let decoder = new StringDecoder('utf8');
  let buffer = '';
  // data event would be called if there is a payload
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  // end event would be called in any case (e.g. it not depends on payload)
  req.on('end', function(){
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use notFound handler
    let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined'
      ? server.router[trimmedPath]
      : handlers.notFound;

    // Construct the data object to send it to handler
    let data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload){
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

      // Use the payload callback by the handler, or default to empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to string
      let payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green, otherwise print red
      if (statusCode == 200) {
        debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
      }
    });
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
  menu: handlers.menu,
  cart: handlers.cart,
  order: handlers.order
}

// Init script
server.init = function() {
  // Start the HTTP server
  // https://stackoverflow.com/questions/9249830/how-can-i-set-node-env-production-on-windows
  server.httpServer.listen(config.httpPort, function() {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} in config ${config.envName} mode!`);
  });
}
// Export the module
module.exports = server;
