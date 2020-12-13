/*
 * Primary file for the API
 *
 *
 */

// Dependencies
var server = require('./lib/server');

// Declare the application
var app = {};

// Init function
app.init = function() {
  // Start the server
  server.init();
};

// Execute
app.init();

// Export the app
module.exports = app;
