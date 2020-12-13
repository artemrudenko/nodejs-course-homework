/*
 * Library for storing and editing data
 *
 */

// Dependencies
let fs = require('fs');
let path = require('path');
let helpers = require('./helpers');

// Container for the module  (to be exported)
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function (dir, fileName, data, callback) {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'wx', function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // Convert data to string
      let stringData = JSON.stringify(data);
      // Write to  file and close it
      fs.writeFile(fileDescriptor, stringData, function (err) {
        if (!err) {
          fs.close(fileDescriptor, function (err) {
            if (!err) {
              // e.g. all is ok
              callback(false);
            } else {
              callback(`Error closing new file!`);
            }
          });
        } else {
          callback('Error writing to new file!');
        }
      });
    } else {
      callback(`Couldn't create new file, it may already exist!`);
    }
  });
};

// Read data from a file
lib.read = function (dir, fileName, callback) {
  fs.readFile(`${lib.baseDir}${dir}/${fileName}.json`, 'utf8', function (err, data) {
    if (!err && data) {
      let parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  })
};

// Update data inside a file
lib.update = function (dir, fileName, data, callback) {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'r+', function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // Convert data to string
      let stringData = JSON.stringify(data);
      // Truncate the file
      fs.ftruncate(fileDescriptor, function (err) {
        if (!err) {
          // Write to  file and close it
          fs.writeFile(fileDescriptor, stringData, function (err) {
            if (!err) {
              fs.close(fileDescriptor, function (err) {
                if (!err) {
                  // e.g. all is ok
                  callback(false);
                } else {
                  callback(`Error closing existing file!`);
                }
              });
            } else {
              callback('Error writing to existing file!');
            }
          });

        } else {
          callback('Error truncating file!');
        }
      });
    } else {
      callback(`Couldn't open the file for updating, it may not exist yet!`);
    }
  });
};

// Delete a file
lib.delete = function (dir, fileName, callback) {
  // Unlink the fileName
  fs.unlink(`${lib.baseDir}${dir}/${fileName}.json`, function (err) {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting file!');
    }
  })
};

// List all the items in a directory
lib.list = function (dir, callback) {
  fs.readdir(`${lib.baseDir}${dir}/`, function (err, data) {
    if (!err && data && data.length > 0) {
      let trimmedFileNames = [];
      data.forEach(function (fileName) {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// Read all the items in a directory
lib.readAll = function (dir, callback) {
  const dirName = `${lib.baseDir}${dir}/`;
  try {
    const output = fs.readdirSync(dirName).map(function (fileName) {
      return fs.readFileSync(dirName + fileName, 'utf-8')
    });
    callback(false, output.map(data => helpers.parseJsonToObject(data)));
  } catch (err) {
    callback(err, []);
  }
};

// Export the module
module.exports = lib;
