/*
 * Create and export configuration variables
 *
 */

// Container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort': 3000,
  'envName': 'staging',
  'hashingSecret': 'thisIsASecret',
  'stripeSecretKey': '',
  'mailgun': {}
};

// Production environment
environments.production = {
  'httpPort': 5000,
  'envName': 'production',
  'hashingSecret': 'thisIsAlsoASecret',
  'stripeSecretKey': '',
  'mailgun': {}
};

// Determine which environment was passed as a cli argument
var currentEnvironment = typeof (process.env.NODE_ENV) == 'string'
  ? process.env.NODE_ENV.toLowerCase()
  : '';

// Check that current environment exists(e.g. one of the environments above), if not, default to staging
var environmentToExport = typeof (environments[currentEnvironment]) === 'object'
  ? environments[currentEnvironment]
  : environments.staging;

// export the module
module.exports = environmentToExport;
