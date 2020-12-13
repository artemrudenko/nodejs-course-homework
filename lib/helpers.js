/*
 * Helpers for the letious tasks
 *
 */

// Dependencies
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

lib.validateEmail = function (email) {
  let re = /^\\w+([-+.']\\w+)*@\\w+([-.]\\w+)*\\.\\w{2,}([-.]\\w+)*$/;
  return re.test(email);
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
    auth: config.mailgun.key,
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

// Export the module
module.exports = lib;
