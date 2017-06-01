const { execSync } = require('child_process');
const path = require('path');
const stream = require('stream');

const clipboardy = require('clipboardy');
const logger = require('loggy');

const build = require('./build.js').build;
const { execp, getBrunchConfigPath } = require('./utils.js');

const deploy = (filePath, options) => {
  filePath = filePath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(filePath, options);
  options.production = true;

  return new Promise((resolve, reject) => {
    build(filePath, options, resolve);
  }).then(() => {
    logger.log(`Deploying "${filePath}" to Now …`);

    const rootDir = path.join(__dirname, '..');
    let output = '';
    let errors = '';

    return execp(`${rootDir}/node_modules/.bin/now ${filePath} --public`, {
      cwd: rootDir,
      stdout: new stream.Writable({
        write: (chunk, enc, next) => {
          const line = chunk.toString(enc);
          output += line;
          loggy.log(line);
          next();
        }
      }),
      stderr: new stream.Writable({
        write: (chunk, enc, next) => {
          const line = chunk.toString(enc);
          errors += chunk.toString(enc);
          loggy.error(line);
          next();
        }
      })
    }).then(() => {
      // const serverUrl = `http${https ? 's' : ''}://${host}:${port}/`;
      // clipboardy.writeSync(serverUrl);
      loggy.log('Deployed!');
      loggy.log('Success:', output);
      loggy.error('Error:', errors);
    });
  }).catch(err => {
    logger.error(err);
  });
};

exports.deploy = deploy;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
