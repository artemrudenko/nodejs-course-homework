/*
 * Helpers for the letious tasks
 *
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');
const config = require('./config');
const StringDecoder = require('string_decoder').StringDecoder;

// Container for all the helpers
let lib = {};

// Create SHA-256 hash
lib.hash = function (str) {
  if (typeof (str) === 'string' && str.length > 0) {
    let hash = crypto.createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
lib.parseJsonToObject = function (str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

// Create a string of random alphanumeric characters of a given length
lib.createRandomString = function (strLength) {
  strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into a string
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    // Start the final string
    let str = '';
    for (i = 1; i <= strLength; i++) {
      // Get a random character from the possible characters
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append this character to the final string
      str += randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
};

lib._performHttpsRequest = function (requestDetails, stringPayload, callback) {
  // Instantiate the request object
  let req = https.request(requestDetails, function (res) {
    // Get the payload, if any
    let decoder = new StringDecoder('utf8');
    let response = '';
    // data event would be called if there is a payload
    res.on('data', function (data) {
      response += decoder.write(data);
    });
    // end event would be called in any case (e.g. it not depends on payload)
    res.on('end', function () {
      response += decoder.end();
      // Grab the status of the sent request
      let status = res.statusCode;

      if (status == 200 || status == 201) {
        callback(false, lib.parseJsonToObject(response));
      } else {
        console.log(`Error: `, response);
        callback(status, response);
      }
    });
  });

  // Bind to the error event so it doesn't get thrown
  req.on("error", e => {
    callback(e, {});
  });

  // Add the payload
  req.write(stringPayload);

  // End the request
  req.end();
}

lib.stripe = function (amount, description, source, callback) {
  // TODO validate parameters
  const payload = {
    amount: amount * 100, // in cents
    currency: 'usd',
    description,
    source
  };
  const stringPayload = querystring.stringify(payload);

  const requestDetails = {
    protocol: "https:",
    hostname: "api.stripe.com",
    method: "POST",
    path: "/v1/charges",
    auth: config.stripeSecretKey,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload)
    }
  };
  lib._performHttpsRequest(requestDetails, stringPayload, callback);
};

lib.mailgun = function (subject, from, to, text, callback) {
  //  TODO validate parameters
  const payload = {
    from,
    to,
    subject,
    text
  };
  const stringPayload = querystring.stringify(payload);
  const requestDetails = {
    auth: `api:${config.mailgun.key}`,
    protocol: "https:",
    hostname: "api.mailgun.net",
    method: "POST",
    path: `/v3/${config.mailgun.sandbox}/messages`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload)
    }
  };

  lib._performHttpsRequest(requestDetails, stringPayload, callback);
};

// Get the string content of a template
lib.getTemplate = function (templateName, data, callback) {
  templateName = typeof (templateName) == 'string' && templateName.length > 0 ? templateName : false;
  data = typeof (data) == 'object' && data != null ? data : {};
  if (templateName) {
    const templatesDir = path.join(__dirname, '/../templates/');
    fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', function (err, str) {
      if (!err && str && str.length > 0) {
        // Do interpolation on the string
        callback(false, lib.interpolate(str, data));
      } else {
        callback('No template could be found!');
      }
    })
  } else {
    callback('A valid template name was\'t specified');
  }
};

// Add the universal header and footer to a string, and pass the provided data object to the header and footer for interpolation
lib.addUniversalTemplates = function (str, data, callback) {
  str = typeof (str) == 'string' && str.length > 0 ? str : '';
  data = typeof (data) == 'object' && data != null ? data : {};
  // Get the header
  lib.getTemplate('_header', data, function (err, headerString) {
    if (!err && headerString) {
      // Get the footer
      lib.getTemplate('_footer', data, function (err, footerString) {
        if (!err && footerString) {
          callback(false, headerString + str + footerString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

// Take a given string and a data object and find/replace all the keys within it
lib.interpolate = function (str, data) {
  str = typeof (str) == 'string' && str.length > 0 ? str : '';
  data = typeof (data) == 'object' && data != null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global"
  for (const keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }
  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof (data[key]) == 'string') {
      const replaceWith = data[key];
      const toFind = `{${key}}`;
      str = str.replace(toFind, replaceWith);
    }
  }
  return str;
};

// Get the contents of a static (public) asset
lib.getStaticAsset = function (fileName, callback) {
  fileName = typeof (fileName) == 'string' && fileName.length > 0 ? fileName : false;
  if (fileName) {
    const publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, function (err, data) {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

// Export the module
module.exports = lib;
