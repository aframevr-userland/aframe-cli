const path = require('path');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const logger = require('loggy');

const serve = (watchPath, options, onCompile) => {
  options = options || {};
  options.server = true;
  logger.log(`Watching "${watchPath}" …`);

  // Copy the server URL to the user's clipboard.
  const host = options.network || options.host || 'localhost';
  const port = options.port || 3333;
  const https = options.https || options.ssl || options.secure || false;
  const serverUrl = `http${https ? 's' : ''}://${host}:${port}/`;
  clipboardy.writeSync(serverUrl);

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
