/*
 * Request handlers
 *
 */

// Dependencies
const tokens = require('./tokens');
const users = require('./users');
const menu = require('./menu');
const cart = require('./cart');
const order = require('./order');
const html = require('./html');

// Define handlers
var handlers = { ...tokens, ...users, ...menu, ...cart, ...order, ...html };

// Ping handler
handlers.ping = (data, callback) => callback(200);

// Not found handler
handlers.notFound = (data, callback) => callback(404);

// Export the module
module.exports = handlers;
