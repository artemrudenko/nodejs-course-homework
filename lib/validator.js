/*
 * Validator related tasks 
 *
 *
 */

// Dependencies

// Container for all the validators
let lib = {};

lib.validateEmail = function (email) {
  // let re = /^\\w+([-+.']\\w+)*@\\w+([-.]\\w+)*\\.\\w{2,}([-.]\\w+)*$/;
  // let re = /^\S+@\S+\.\S+$/;
  let re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return re.test(email);
};

// Export the module
module.exports = lib;
