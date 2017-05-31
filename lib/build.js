const path = require('path');

const brunch = require('brunch');
const logger = require('loggy');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const build = (filePath, options) => {
  filePath = filePath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(filePath, options);
  logger.log(`Watching "${filePath}" …`);

  try {
    return brunch.build(filePath, options);
  } catch (err) {
    logger.error(`Could not build "${filePath}" …`);
    throw err;
  }
};

exports.build = build;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
