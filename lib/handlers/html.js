/*
 * HTML Handlers
 *
 */

// Dependencies
const helpers = require('../helpers');

// Define handlers
const lib = {}

lib._base = function (data, templateData, templateName, callback) {
  // Reject any request that isn't GET
  if (data.method == 'get') {
    // Read in a template as a string
    helpers.getTemplate(templateName, templateData, function (err, str) {
      if (!err && str) {
        // Add the universal header and footer 
        helpers.addUniversalTemplates(str, templateData, function (err, finalString) {
          if (!err && finalString) {
            // Return that page as HTML
            callback(200, finalString, 'html');
          } else {
            callback(500, undefined, 'html');
          }
        })
      } else {
        callback(500, undefined, 'html');
      }
    });
  } else {
    // method not allowed
    callback(405, undefined, 'html');
  }
}

// Index handler
lib.index = function (data, callback) {
  const templateData = {
    'head.title': 'Pizza-Shmizza',
    'head.description': 'We offer the best pizza in your city!',
    'body.class': 'index'
  };
  lib._base(data, templateData, 'index', callback);
}

// Create Account handler
lib.accountCreate = function (data, callback) {
  // Prepare some data for interpolation
  const templateData = {
    'head.title': 'Create an Account',
    'head.description': 'Signup is easy and only takes a few seconds',
    'body.class': 'accountCreate'
  };
  lib._base(data, templateData, 'accountCreate', callback);
};

// Create New Session
lib.sessionCreate = function (data, callback) {
  const templateData = {
    'head.title': 'Login to your Account',
    'head.description': 'Please enter your phone number and password to access your account',
    'body.class': 'sessionCreate'
  };
  lib._base(data, templateData, 'sessionCreate', callback);
};

// Session has been deleted
lib.sessionDeleted = function (data, callback) {
  const templateData = {
    'head.title': 'Loged Out',
    'head.description': 'You have been logged out of your account',
    'body.class': 'sessionDeleted'
  };
  lib._base(data, templateData, 'sessionDeleted', callback);
};

// Edit your account 
lib.accountEdit = function (data, callback) {
  const templateData = {
    'head.title': 'Account Settings',
    'body.class': 'accountEdit'
  };
  lib._base(data, templateData, 'accountEdit', callback);
};

// Account has been deleted
lib.accountDeleted = function (data, callback) {
  const templateData = {
    'head.title': 'Account Deleted',
    'head.description': 'Your account has been deleted',
    'body.class': 'accountDeleted'
  };
  lib._base(data, templateData, 'accountDeleted', callback);
};

// Menu
lib.menuList = function (data, callback) {
  var templateData = {
    'head.title': 'Our Menu',
    'head.description': 'Here you can see what we have for you',
    'body.class': 'menuList'
  };
  lib._base(data, templateData, 'menuList', callback);
};

// Cart
lib.userCart = function (data, callback) {
  var templateData = {
    'head.title': 'Your Cart',
    'head.description': 'Here you can see your selection',
    'body.class': 'userCart'
  };
  lib._base(data, templateData, 'userCart', callback);
};

// Order
lib.userOrder = function (data, callback) {
  var templateData = {
    'head.title': 'Your Order',
    'head.description': 'Here you can complete your order',
    'body.class': 'userOrder'
  };
  lib._base(data, templateData, 'userOrder', callback);
};

// Order completed
lib.userOrderCompleted = function (data, callback) {
  const templateData = {
    'head.title': 'Order',
    'head.description': 'Your have successfully completed your order. You will receive email notification with details soon',
    'body.class': 'userOrderCompleted'
  };
  lib._base(data, templateData, 'userOrderCompleted', callback);
};

// Favicon handler
lib.favicon = function (data, callback) {
  // Reject any request that isn't a GET
  if (data.method == 'get') {
    // Read in the favicon's data
    helpers.getStaticAsset('favicon.ico', function (err, data) {
      if (!err && data) {
        // Callback the data
        callback(200, data, 'favicon');
      } else {
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};

// Public assets
lib.public = function (data, callback) {
  // Reject any request that isn't GET
  if (data.method == 'get') {
    // Get the file name being requested
    var trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
    if (trimmedAssetName.length > 0) {
      // Read in the asset's data
      helpers.getStaticAsset(trimmedAssetName, function (err, data) {
        if (!err && data) {
          // Determine the content type (default to plain text)
          var contentType = 'plain';
          if (trimmedAssetName.indexOf('.css') > -1) {
            contentType = 'css';
          }
          if (trimmedAssetName.indexOf('.png') > -1) {
            contentType = 'png';
          }
          if (trimmedAssetName.indexOf('.jpg') > -1) {
            contentType = 'jpg';
          }
          if (trimmedAssetName.indexOf('.ico') > -1) {
            contentType = 'favicon';
          }
          // Callback the data
          callback(200, data, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }
  } else {
    callback(405);
  }
}

module.exports = lib;