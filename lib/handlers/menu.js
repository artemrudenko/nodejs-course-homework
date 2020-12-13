/*
 * Menu Items handlers
 *
 */

// Dependencies
const _data = require('../data');

// Instantiate the lib object
let lib = {};

// MenuItems handler
lib.menu = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    lib._menu[data.method](data, callback);
  } else {
    // e.g. method not allowed error
    callback(405);
  }
};
// Container for the menuItems submethods
lib._menu = {};

// MenuItems - post
// Required data: name, price, weight, description
// Optional data: none
lib._menu.post = (data, callback) => {
  // Check that all required fields are filled out
  let name = typeof (data.payload.name) === 'string' && data.payload.name.trim().length > 0
    ? data.payload.name.trim()
    : false;
  let price = typeof (data.payload.price) === 'number' && data.payload.price > 0
    ? data.payload.price
    : false;
  let weight = typeof (data.payload.weight) === 'number' && data.payload.weight > 0
    ? data.payload.weight
    : false;
  let description = typeof (data.payload.description) === 'string' && data.payload.description.trim().length > 0
    ? data.payload.description.trim()
    : false;

  if (name && price && weight && description) {
    //  Make sure that the item doesn't already exist
    _data.read('menu', name, (err, itemData) => {
      if (err) {
        // Create the item object
        let itemObject = {
          id: helpers.createRandomString(20),
          name,
          price,
          weight,
          description
        };
        // Store the menu item
        _data.create('menu', name, itemObject, (err) => {
          if (!err) {
            callback(200)
          } else {
            callback(500, { 'Error': 'Could not create the new menu item!' });
          }
        });
      } else {
        callback(404, { 'Error': 'A menu item with that name already exists!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields' });
  }
};

// Users - get
// Required data: none
// Optional data: name (return all if not specified)
// @TODO later think on user roles
lib._menu.get = (data, callback) => {
  // Check that the itemName is valid
  let name = typeof (data.queryStringObject.name) === 'string' && data.queryStringObject.name.trim().length > 0
    ? data.queryStringObject.name.trim()
    : 'all';
  // Get the token from the headers
  let token = typeof (data.headers.token) == 'string'
    ? data.headers.token
    : false;
  // Lookup the user by reading the token
  _data.read('tokens', token, (err, tokenData) => {
    if (!err && tokenData) {
      if (name === 'all') {
        _data.readAll('menu', (err, items) => {
          if (!err && items && items.length > 0) {
            callback(200, items);
          } else {
            callback(500, "Error: Could not find any menu items!");
          }
        });
      } else {
        // Lookup the menu item
        _data.read('menu', name, (err, data) => {
          if (!err && data) {
            callback(200, data);
          } else {
            callback(404);
          }
        });
      }
    } else {
      callback(403);
    }
  });
};

// Users - put
// Required data: name
// Optional data: price, weight, description (at least one must be specified)
lib._menu.put = (data, callback) => {
  // Check for the required fields
  let name = typeof (data.payload.name) === 'string' && data.payload.name.trim().length > 0
    ? data.payload.name.trim()
    : false;

  // Check for the optional fields
  let price = typeof (data.payload.price) === 'number' && data.payload.price > 0
    ? data.payload.price
    : false;
  let weight = typeof (data.payload.weight) === 'number' && data.payload.weight > 0
    ? data.payload.weight
    : false;
  let description = typeof (data.payload.description) === 'string' && data.payload.description.trim().length > 0
    ? data.payload.description.trim()
    : false;

  //  Error if the name is invalid
  if (name) {
    // Error if nothing is sent to update
    if (price || weight || description) {
      // Lookup the menu item
      _data.read('menu', name, function (err, itemData) {
        if (!err && itemData) {
          // Update the fields neccessary
          if (price) {
            itemData.price = price;
          }
          if (weight) {
            itemData.weight = weight;
          }
          if (description) {
            itemData.description = description;
          }
          // Store the new updates
          _data.update('menu', name, itemData, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { 'Error': 'Could not update the menu item!' });
            }
          });
        } else {
          callback(400, { 'Error': 'The specified menu item doesn\'t exist!' });
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
// Required data: name
lib._menu.delete = (data, callback) => {
  // Check that the name is valid
  let name = typeof (data.queryStringObject.name) === 'string' && data.queryStringObject.name.trim().length > 0
    ? data.queryStringObject.name.trim()
    : false;
  if (name) {
    // Remove the menu item
    _data.read('menu', name, (err, itemData) => {
      if (!err && itemData) {
        _data.delete('menu', name, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { 'Error': 'Could not delete the specified menu item!' });
          }
        });
      } else {
        callback(404, { 'Error': 'Could not find the specified menu item!' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required fields!' });
  }
};

module.exports = lib;
