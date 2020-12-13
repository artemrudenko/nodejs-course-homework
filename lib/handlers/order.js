/*
 * Order handlers
 *
 */

// Dependencies
const helpers = require('../helpers');
const _data = require('../data');
const tokens = require('./tokens');
const util = require('util');
const debug = util.debuglog('order');

// Instantiate the lib object
let lib = {};

// Order handler
lib.order = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    lib._order[data.method](data, callback);
  } else {
    // e.g. method not allowed error
    callback(405);
  }
};

// Container for the order methods
lib._order = {};

// Order - post
// Required data: paymentToken 
// Optional data: none
lib._order.post = (data, callback) => {
  // Validate inputs
  let paymentToken = typeof (data.payload.paymentToken) === 'string' && data.payload.paymentToken.trim().length > 0
    ? data.payload.paymentToken.trim()
    : false;

  if (paymentToken) {
    // Get the token from the headers
    let token = typeof (data.headers.token) == 'string'
      ? data.headers.token
      : false;
    // Lookup the user by reading  the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        let userName = tokenData.userName;
        _data.read('cart', userName, (err, cardData) => {
          if (!err && cardData) {
            // Lookup the user data
            console.log(cardData);
            _data.read('users', userName, (err, userData) => {
              if (!err && userData) {
                // Send to stripe
                // TODO calculate sum base on order items
                helpers.stripe(cardData.total, `Pizza's order for: ${userName}`, paymentToken, (err, stripeResponseBody) => {
                  if (!err && stripeResponseBody) {
                    debug('Sending stripe is OK!', stripeResponseBody);
                    // Create a random id for the order
                    let orderId = helpers.createRandomString(20);

                    // Init order object
                    let orderObject = {
                      id: orderId,
                      details: {
                        payment: stripeResponseBody,
                        cart: cardData
                      },
                      userName,
                      email: userData.email
                    };
                    _data.create('orders', orderId, orderObject, (err) => {
                      if (!err) {
                        let orders = userData.orders ? userData.orders : [];
                        orders.push(orderId);

                        _data.update('users', userName, userData, (err) => {
                          if (!err) {
                            helpers.mailgun(
                              `Your receipt for: 'Pizza's order#:${orderId} for: ${userName}'`,
                              'pizzamizza@gmail.com',
                              userData.email,
                              `You order was successful!\r\nPaymentDetails: ${JSON.stringify(stripeResponseBody)}`,
                              (err, mailgunResponseBody) => {
                                if (!err) {
                                  debug('Sending mailgun is OK!', mailgunResponseBody);
                                  // Empty cart
                                  _data.delete('cart', userName, (err) => {
                                    if (!err) {
                                      orderObject.details.mailgun = mailgunResponseBody;
                                      callback(200, orderObject);
                                    } else {
                                      callback(500, { "Error": "Failed to cleanup user's cart" });
                                    }
                                  });
                                } else {
                                  console.log(mailgunResponseBody);
                                  callback(500, { "Error": "Failed to send email notification!" + err });
                                }
                              });
                          } else {
                            callback(500, { "Error": "Failed to remove cart item" });
                          }
                        });
                      } else {
                        callback(500, { "Error": "Failed to save order data!" });
                      }
                    });
                  } else {
                    console.log(stripeResponseBody);
                    callback(500, { "Error": "Failed to send stripe request:" + err });
                  }
                });
              } else {
                callback(404, { "Error": "Can't find user!" });
              }
            });
          } else {
            callback(404, { "Error": "User's cart is empty!" });
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required inputs, or inputs are invalid!' });
  }
};

// Order - get
// Required data: id
// Optional data: none
lib._order.get = (data, callback) => {
  // Check that the id string is valid
  let id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length == 20
    ? data.queryStringObject.id.trim()
    : false;
  if (id) {
    // Lookup the order
    _data.read('orders', id, (err, orderData) => {
      if (!err && orderData) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string'
          ? data.headers.token
          : false;
        // Verifry that the given token is valid and belongs to the user who created the order
        tokens.verifyToken(token, orderData.userName, (isValid) => {
          if (isValid) {
            // Return the order data
            callback(200, orderData);
          } else {
            callback(403, { 'Error': 'Missing required token in header, or token is invalid!' });
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

// Order - delete
// Required data: id
// Optional data: none
lib._order.delete = (data, callback) => {
  // Check that the id is valid
  let id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length == 20
    ? data.queryStringObject.id.trim()
    : false;
  if (id) {
    // Lookup the order
    _data.read('orders', id, (err, orderData) => {
      if (!err && orderData) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string'
          ? data.headers.token
          : false;
        // Verifry that the given token is valid for the userName
        tokens.verifyToken(token, orderData.userName, (isValid) => {
          if (isValid) {
            // Delete the order
            _data.delete('orders', id, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { 'Error': 'Could not delete the order' });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { 'Error': 'The specified order id does not exists!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

module.exports = lib;