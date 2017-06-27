const path = require('path');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const logger = require('loggy');
const opn = require('opn');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const serve = (watchPath, options) => new Promise((resolve, reject) => {
  watchPath = watchPath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(watchPath, options);
  options.server = true;
  options.network = true;
  logger.log(`Watching "${watchPath}" …`);

  // Copy the server URL to the user's clipboard.
  const port = options.port || 3333;
  const https = options.https || options.ssl || options.secure || false;
  const serverUrl = `http${https ? 's' : ''}://localhost:${port}/`;
  try {
    return brunch.watch(options, () => {
      clipboardy.writeSync(serverUrl);
      if (!options['no-open']) {
        opn(serverUrl, {wait: false});
      }
      resolve(serverUrl);
    });
  } catch (err) {
    logger.error(`Could not watch "${watchPath}" …`);
    reject(err);
  }
});

exports.serve = serve;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
