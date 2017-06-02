const path = require('path');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const logger = require('loggy');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const serve = (watchPath, options, onCompile) => {
  watchPath = watchPath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(watchPath, options);
  options.server = true;
  options.network = true;
  logger.log(`Watching "${watchPath}" …`);

  // Copy the server URL to the user's clipboard.
  const port = options.port || 3333;
  const https = options.https || options.ssl || options.secure || false;
  clipboardy.writeSync(`http${https ? 's' : ''}://localhost:${port}/`);

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
