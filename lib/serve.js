const path = require('path');

const brunch = require('brunch');
const logger = require('loggy');

const serve = (watchPath, options, onCompile) => {
  options = options || {};
  options.server = true;
  logger.log(`Watching "${watchPath}" …`);
  try {
    return brunch.watch(watchPath, options, onCompile);
  } catch (err) {
    logger.error(`Could not watch "${watchPath}" …`);
    throw err;
  }
};

exports.serve = serve;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
