const path = require('path');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const fs = require('fs-extra');
const glob = require('glob');
const logger = require('loggy');
const opn = require('opn');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const IPFS_TIMEOUT = 3000;

const deploy = (deployPath, options, onCompile) => {
  deployPath = deployPath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(deployPath, options);
  logger.log(`Deploying "${deployPath}" …`);

  // const build = require('./build.js').build;

  // return build(deployPath, options).then(() => {
    let builtPath;
    try {
      builtPath = require(options.config).paths.public;
    } catch (err) {
      throw err;
    }

    const IPFS = require('ipfs-daemon');

    const ipfsNode = new IPFS();

    const ipfsReady = () => new Promise((resolve, reject) => {
      // The IPFS daemon is running, and this IPFS node is now ready to use.

      let filesAdded = [];
      let isIndexFile = false;
      let indexHash = null;

      return new Promise((resolve, reject) => {
        glob(builtPath + '/**', {
          dot: true,
          nodir: true
        }, (err, files) => {
          if (err || !files) {
            reject(new Error('Could not find public files to deploy'));
            return;
          }
          resolve(files);
        });
      }).then(files => {
        files.forEach(file => {
          const fileToAdd = {
            path: file,
            content: fs.createReadStream(file)
          };

          filesAdded.push(new Promise((resolve, reject) => {
            const ipfsAddFile = (err, res) => {
              if (err || !res) {
                logger.error('Error adding to IPFS:', err, res);
                reject(err);
                return;
              }

              res.forEach(file => {
                if (file && file.hash) {
                  logger.log(`Successfully published file "${file.path}" to IPFS:`, file.hash);

                  resolve({
                    path: fileToAdd.path,
                    pathBasename: path.basename(fileToAdd.path),
                    hash: file.hash
                  });
                }
              });
            };

            ipfsNode.files.add(fileToAdd.content, ipfsAddFile);
          }));
        });

        return Promise.all(filesAdded).then(filesList => {
          let indexHash = '';
          let idx = 0;
          for (idx = 0; idx < filesList.length; idx++) {
            if (filesList[idx].pathBasename === 'index.html') {
              indexHash = filesList[idx].hash;
              break;
            }
          }
          for (idx = 0; idx < filesList.length; idx++) {
            if (filesList[idx].pathBasename.endsWith('.html')) {
              indexHash = filesList[idx].hash;
              break;
            }
          }
          if (indexHash) {
            const deployedUrl = `https://ipfs.io/ipfs/${indexHash}`;
            // Copy to the user's clipboard the URL of the deployed project.
            clipboardy.writeSync(deployedUrl);
            opn(deployedUrl, {wait: false});
          }

          process.nextTick(() => {
            logger.log('Stopping IPFS node');
            ipfsNode.stop(() => {
              // The node is now offline.
              resolve(true);
            });
            setTimeout(() => {
              reject(new Error('Could not stop IPFS node (timed out after 3 seconds)'));
            }, IPFS_TIMEOUT);
          });
        });
      });
    });

    return new Promise((resolve, reject) => {
      let ipfsNodeReady = false;
      ipfsNode.on('ready', () => {
        ipfsReady().then(() => {
          ipfsNodeReady = true;
        }).catch(() => {
          ipfsNodeReady = true;
        });
      });
      setTimeout(() => {
        if (!ipfsNodeReady) {
          reject(new Error('Could not connect to IPFS node (timed out after 3 seconds)'));
        }
      }, IPFS_TIMEOUT);
    });


  // }).catch(err => {
  //   logger.error(`Could not deploy "${deployPath}" …`);
  //   throw err;
  // });
};

exports.deploy = deploy;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
