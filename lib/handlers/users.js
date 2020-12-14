/*
 * Users handlers
 *
 */

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');
const tokens = require('./tokens');
const validator = require('../validator');

// Instantiate the lib object
let lib = {};

// Users handler
lib.users = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    lib._users[data.method](data, callback);
  } else {
    // e.g. method not allowed error
    callback(405);
  }
};
// Container for the users submethods
lib._users = {};

// Users - post
// Required data: name, password, email, street
// Optional data: none
lib._users.post = (data, callback) => {
  // Check that all required fields are filled out
  let userName = typeof (data.payload.userName) === 'string' && data.payload.userName.trim().length > 0
    ? data.payload.userName.trim()
    : false;
  let password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0
    ? data.payload.password.trim()
    : false;
  let email = typeof (data.payload.email) === 'string' && validator.validateEmail(data.payload.email.trim())
    ? data.payload.email.trim()
    : false;
  let street = typeof (data.payload.street) === 'string' && data.payload.street.trim().length > 0
    ? data.payload.street.trim()
    : false;
  if (userName && password && email && street) {
    //  Make sure that the user doesnt already exist
    _data.read('users', userName, (err, data) => {
      if (err) {
        // Hash the password
        let hashedPassword = helpers.hash(password);
        // Create the user object
        if (hashedPassword) {
          let userObject = {
            userName,
            email,
            street,
            hashedPassword
          };
          // Store the user
          _data.create('users', userName, userObject, (err) => {
            if (!err) {
              callback(200)
            } else {
              console.log(err);
              callback(500, { 'Error': 'Could not create the new user!' });
            }
          });
        } else {
          callback(500, { 'Error': 'Could not has the user\'s password!' });
        }
      } else {
        // User already exists
        callback(404, { 'Error': 'A user with that userName already exists!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields' });
  }
};

// Users - get
// Required data: email
// Optional data: none
lib._users.get = (data, callback) => {
  // Check that the email is valid
  let userName = typeof (data.queryStringObject.userName) === 'string' && data.queryStringObject.userName.trim().length > 0
    ? data.queryStringObject.userName.trim()
    : false;
  if (userName) {
    // Get the token from the headers
    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verifry that the given token is valid for the userName
    tokens.verifyToken(token, userName, (isValid) => {
      if (isValid) {
        // Lookup the user
        _data.read('users', userName, (err, data) => {
          if (!err && data) {
            //  Remove the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { 'Error': 'Missing required token in header, or token is invalid!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

// Users - put
// Required data: userName
// Optional data: street, email, password (at least one must be specified)
lib._users.put = function (data, callback) {
  // Check for the required fields
  let userName = typeof (data.payload.userName) === 'string' && data.payload.userName.trim().length > 0
    ? data.payload.userName.trim()
    : false;

  // Check for the optional fields
  let street = typeof (data.payload.street) === 'string' && data.payload.street.trim().length > 0
    ? data.payload.street.trim()
    : false;
  let email = typeof (data.payload.email) === 'string' && validator.validateEmail(data.payload.email.trim())
    ? data.payload.email.trim()
    : false;
  let password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0
    ? data.payload.password.trim()
    : false;

  //  Error if the userName is invalid
  if (userName) {
    // Error if nothing is sent to update
    if (street || email || password) {
      // Get the token from the headers
      let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
      // Verifry that the given token is valid for the userName
      tokens.verifyToken(token, userName, function (isValid) {
        if (isValid) {
          // Lookup the user
          _data.read('users', userName, function (err, userData) {
            if (!err && userData) {
              // Update the fields neccessary
              if (street) {
                userData.street = street;
              }
              if (email) {
                userData.email = email;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users', userName, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { 'Error': 'Could not update the user!' });
                }
              });
            } else {
              callback(400, { 'Error': 'The specified user does not exist!' });
            }
          });
        } else {
          callback(403, { 'Error': 'Missing required token in header, or token is invalid!' });
        }
      });
    } else {
      callback(400, { 'Error': 'Missing fields to update!' });
    }
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

// Users - delete
// Required data: userName
lib._users.delete = function (data, callback) {
  // Check that the userName is valid
  let userName = typeof (data.queryStringObject.userName) === 'string' && data.queryStringObject.userName.trim().length == 10
    ? data.queryStringObject.userName.trim()
    : false;
  if (userName) {
    // Get the token from the headers
    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verifry that the given token is valid for the userName
    tokens.verifyToken(token, userName, function (isValid) {
      if (isValid) {
        // Remove the user
        _data.read('users', userName, function (err, userData) {
          if (!err && userData) {
            _data.delete('users', userName, function (err) {
              if (!err) {
                callback(200);
              } else {
                callback(500, { 'Error': 'Could not delete the specified user!' });
              }
            });
          } else {
            callback(404, { 'Error': 'Could not find the specified user!' });
          }
        });
      } else {
        callback(403, { 'Error': 'Missing required token in header, or token is invalid!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

module.exports = lib;
