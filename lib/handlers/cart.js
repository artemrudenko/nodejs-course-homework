/*
 * Shoping Cart handlers
 *
 */

// Dependencies
const { debug } = require('console');
const _data = require('../data');
const helpers = require('../helpers');

// Instantiate the lib object
let lib = {};

// Shoping Cart handler
lib.cart = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    lib._cart[data.method](data, callback);
  } else {
    // e.g. method not allowed error
    callback(405);
  }
};

// Container for the shopingCart methods
lib._cart = {};

// Shoping Cart - post - creates empty user cart
// Required data: none
// Optional data: none
lib._cart.post = function (data, callback) {
  // Get the token from the headers
  let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
  // Lookup the user by reading  the token
  _data.read('tokens', token, (err, tokenData) => {
    if (!err && tokenData) {
      let userName = tokenData.userName;
      // Make sure that the item doesn't already exist
      _data.read('cart', userName, (err, cartData) => {
        if (err) {
          // Lookup the user data
          _data.read('users', userName, (err, userData) => {
            if (!err && userData) {
              const shopingCartObject = {
                id: helpers.createRandomString(20),
                items: [],
                total: 0
              };
              // Save the object
              _data.create('cart', userName, shopingCartObject, (err) => {
                if (!err) {
                  // Add the shopingCartId to the user's object
                  userData.shopingCartId = shopingCartObject.id;
                  // Save the new user data
                  _data.update('users', userName, userData, function (err) {
                    if (!err) {
                      // Return the data about the new shoping cart item
                      callback(200, shopingCartObject);
                    } else {
                      callback(500, { 'Error': 'Could not update the user with the new shoping card item!' });
                    }
                  });
                } else {
                  callback(500, { 'Error': 'Could not create the new shoping card item!' });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(404, { 'Error': 'A cart for the specified user already exists!' });
        }
      });
    } else {
      callback(403);
    }
  });
};

// Shoping Cart - get
// Required data: none
// Optional data: none
lib._cart.get = (data, callback) => {
  // Get the token from the headers
  let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
  // Lookup the user by reading  the token
  _data.read('tokens', token, (err, tokenData) => {
    if (!err && tokenData) {
      let userName = tokenData.userName;
      // Lookup the cart
      _data.read('cart', userName, (err, cartData) => {
        if (!err && cartData) {
          callback(200, cartData);
        } else {
          callback(404);
        }
      });
    } else {
      callback(403, { 'Error': 'Missing required token in header, or token is invalid!' });
    }
  });
};

// Shoping Cart - put
// Required data: name, quantity
// Optional data: index
lib._cart.put = (data, callback) => {
  // Check for the required field
  var name = typeof (data.payload.name) === 'string' && data.payload.name.trim().length > 0
    ? data.payload.name.trim()
    : false;
  var quantity = typeof (data.payload.quantity) === 'number' && data.payload.quantity >= 0
    ? data.payload.quantity
    : -1;
  var index = typeof (data.payload.index) === 'number' && data.payload.index >= 0
    ? data.payload.index
    : -1;
  if (name && quantity > -1) {
    // Get the token from the headers
    let token = typeof (data.headers.token) == 'string'
      ? data.headers.token
      : false;
    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        let userName = tokenData.userName;
        // Lookup the cart
        _data.read('cart', userName, (err, cartData) => {
          if (!err && cartData) {
            _data.readAll('menu', (err, menuItems) => {
              if (!err && menuItems) {
                if (index > -1) {
                  if (quantity === 0) {
                    cartData.items.splice(index, 1);
                  } else {
                    cartData.items[index] = { name, quantity };
                  }
                } else {
                  cartData.items.push({ name, quantity });
                }

                // Calculate total
                let total = 0;
                cartData.items.forEach(item => {
                  let res = menuItems.find(menuItem => menuItem.name == item.name);
                  if (res) {
                    total += res.price * item.quantity;
                  } else {
                    // @TODO think how to handle this case
                    debug(`Item: ${item} was't found!`);
                  }
                });

                cartData.total = total;
                // Store the updates
                _data.update('cart', userName, cartData, (err) => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { 'Error': 'Could not update the cart data!' });
                  }
                });
              } else {
                callback(500, { "Error": "Couldn't load menu items!" });
              }
            });
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

// Shoping Cart - delete
// Required data: none
// Optional data: none
lib._cart.delete = (data, callback) => {
  // Get the token from the headers
  let token = typeof (data.headers.token) == 'string'
    ? data.headers.token
    : false;
  // Lookup the user by reading  the token
  _data.read('tokens', token, (err, tokenData) => {
    if (!err && tokenData) {
      let userName = tokenData.userName;
      // Lookup the cart
      _data.read('cart', userName, (err, cartData) => {
        if (!err && cartData) {
          // Delete the cart data
          _data.delete('cart', userName, (err) => {
            if (!err) {
              // Lookup the user
              _data.read('users', userName, (err, userData) => {
                if (!err && userData) {
                  delete userData['shopingCartId'];
                  // Re-save the user's data
                  _data.update('users', userName, userData, (err) => {
                    if (!err) {
                      callback(200);
                    } else {
                      callback(500, { 'Error': 'Could not update the specified user!' });
                    }
                  });
                } else {
                  callback(500, { 'Error': 'Could not find the user who created the shoping cart item, so could not remove the shoping cart id from user object!' });
                }
              });

            } else {
              callback(500, { 'Error': 'Could not delete the shoping cart data' });
            }
          });

        } else {
          callback(400, { 'Error': 'The specified user hasn\'t shoping cart!' });
        }
      });
    } else {
      callback(403, { 'Error': 'Missing required token in header, or token is invalid!' });
    }
  });
};

module.exports = lib;
