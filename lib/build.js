const path = require('path');

const brunch = require('brunch');
const logger = require('loggy');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const build = (filePath, options) => {
  return new Promise((resolve, reject) => {
    filePath = filePath || process.cwd();
    options = options || {};
    options.config = options.config || getBrunchConfigPath(filePath, options);
    logger.log(`Building project "${filePath}" …`);

    try {
      brunch.build(options, resolve);
    } catch (err) {
      logger.error(`Could not build project "${filePath}" …`);
      throw err;
    }
  }).then(() => {
    let builtPath = null;
    try {
      builtPath = path.resolve(filePath, require(options.config).paths.public);
    } catch (err) {
    }
    if (builtPath) {
      logger.log(`Built project "${filePath}" to "${builtPath}"`);
      return Promise.resolve(builtPath);
    } else {
      logger.log(`Built project "${filePath}"`);
    }
  });
};

exports.build = build;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
