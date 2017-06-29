const path = require('path');
const url = require('url');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const express = require('express');
const formidable = require('formidable');
const logger = require('loggy');
const opn = require('opn');
const fs = require('fs-extra');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const serve = (watchPath, options) => new Promise((resolve, reject) => {
  watchPath = watchPath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(watchPath, options);
  options.server = true;
  options.network = true;

  const optionsFile = require(options.config);

  logger.log(`Watching "${watchPath}" …`);

  // Copy the server URL to the user's clipboard.
  const port = (optionsFile.server && optionsFile.server.port) || 3333;
  const https = options.https || options.ssl || options.secure || false;
  const serverUrl = `http${https ? 's' : ''}://localhost:${port}/`;
  try {
    const watcher = brunch.watch(options, () => {
      // saves preview videos from recorder component.
      watcher.server.on('request', function (req, res) {
        const method = req.method.toLowerCase();
        const pathname = url.parse(req.url).pathname;

        if (method === 'post' && pathname === '/upload') {
          let form = new formidable.IncomingForm();
          let files = [];

          form.encoding = 'binary';
          form.keepExtensions = true;
          form.multiple = true;

          const uploadDir = path.join(watchPath, 'app/assets/video/');

          fs.ensureDir(uploadDir);

          form.on('fileBegin', function(name, file) {
            file.path = path.join(uploadDir, file.name);
          })

          form.on('file', (field, file) => {
            files.push([field, file]);
          });

          form.on('error', formErr => {
            console.error(formErr);
          });

          form.on('end', () => {
            res.end();
          });

          form.parse(req);
        }
      });

      logger.log(`Local server running: ${serverUrl}`);
      if (!options.noClipboard) {
        clipboardy.writeSync(serverUrl);
      }
      if (!options.noOpen) {
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
