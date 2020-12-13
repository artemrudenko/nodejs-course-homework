/*
 * Token handlers
 *
 */

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');

// Instantiate the lib object
let lib = {};

// Tokens handler
lib.tokens = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    lib._tokens[data.method](data, callback);
  } else {
    // e.g. method not allowed error
    callback(405);
  }
};

// Container for the tokens methods
lib._tokens = {};


// Tokens - post
// Required data: userName, password
// Optional data: none
lib._tokens.post = (data, callback) => {
  // Check that all required fields are filled out
  let userName = typeof (data.payload.userName) === 'string' && data.payload.userName.trim().length > 0
    ? data.payload.userName.trim()
    : false;
  let password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0
    ? data.payload.password.trim()
    : false;
  if (userName && password) {
    // Lookup the user who matches that userName
    _data.read('users', userName, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password, and compare it to the password stored in the userObject
        let hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // If valid create a new token with a random name. Set expiration date 1 hour in the future
          let tokenId = helpers.createRandomString(20);
          let expires = Date.now() + 1000 * 60 * 60;
          let tokenObject = {
            userName,
            id: tokenId,
            expires
          };
          // Store the token
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { 'Error': 'Could not create the new token!' });
            }
          })
        } else {
          callback(400, { 'Error': 'Password did not match the specified user\'s stored password!' });
        }
      } else {
        callback(400, { 'Error': 'Could not find the specified user!' });
      }
    });
    //
  } else {
    callback(400, { 'Error': 'Missing required fields' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
lib._tokens.get = (data, callback) => {
  // Check that the id string is valid
  let id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length == 20
    ? data.queryStringObject.id.trim()
    : false;
  if (id) {
    // Lookup the user
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
lib._tokens.put = function (data, callback) {
  // Check for the required fields
  let id = typeof (data.payload.id) === 'string' && data.payload.id.trim().length == 20
    ? data.payload.id.trim()
    : false;
  let extend = typeof (data.payload.extend) === 'boolean' && data.payload.extend == true
    ? true
    : false;
  //  Error if the id string is invalid
  if (id && extend) {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure that token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour later from now
          tokenData.expires = Date.now() + 1000 * 60 * 60 * 24;
          // Store the new updates
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { 'Error': 'Could not update the token\'s expiration!' });
            }
          });
        } else {
          callback(400, { 'Error': 'The specified token has already expired, and cannot be extended!' });
        }
      } else {
        callback(400, { 'Error': 'The specified token does not exist!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field(s) or field(s) are invalid!' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
lib._tokens.delete = (data, callback) => {
  // Check that the token id is valid
  let id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length == 20
    ? data.queryStringObject.id.trim()
    : false;
  if (id) {
    // Remove the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        _data.delete('tokens', id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { 'Error': 'Could not delete the specified token!' });
          }
        });
      } else {
        callback(404, { 'Error': 'Could not find the specified token!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

// Verify that a given token id is currently valid for a given user
lib.verifyToken = (id, userName, callback) => {
  // Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that token is for the given user and has not expired
      if (tokenData.userName == userName && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false)
    }
  });
};

// Export the module
module.exports = lib;
