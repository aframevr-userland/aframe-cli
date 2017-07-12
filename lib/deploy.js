const path = require('path');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const fs = require('fs-extra');
const glob = require('glob');
const logger = require('loggy');
const opn = require('opn');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;
const submitToIndex = require('./submit.js').submit;

const deploy = (deployPath, options) => {
  deployPath = deployPath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(deployPath, options);
  logger.log(`Deploying project "${deployPath}" …`);

  const build = require('./build.js').build;
  return build(deployPath, options).then(builtPath => {
    if (builtPath) {
      deployPath = builtPath;
      buildDone(builtPath);
    }
  }).catch(() => {
    buildDone();
  });

  function buildDone (builtPath) {
    return fs.readJson(path.join(builtPath ? builtPath : deployPath, 'package.json')).then(pkgObj => {
      return pkgObj;
    }, err => {
      return fs.readJson(path.join(deployPath, 'package.json')).then(pkgObj => {
        return pkgObj;
      }, () => {
        return {};
      });
    }).then(pkgObj => {
      pkgObj = pkgObj || {};
      let rootDir = path.basename(deployPath);
      if (deployPath === builtPath) {
        rootDir = path.basename(path.resolve(builtPath, '..'));
      }
      return deployToIPFS(options, deployPath, rootDir, pkgObj).then(deployedUrl => {
        if (!deployedUrl) {
          throw new Error(`Unknown error occurred upon deploying project "${deployPath}"`);
        }
        return deployedUrl;
      }, err => {
        throw err;
      });
    }).catch(err => {
      if (err) {
        logger.error(`Could not deploy project "${deployPath}":`, err);
      } else {
        logger.error(`Could not deploy project "${deployPath}"`);
      }
      throw err;
      process.exit(1);
    });
  }
};

const deployToIPFS = (options, deployPath, rootDir, pkgObj) => {
  const IPFS = require('ipfs-daemon');

  const ipfsAddFiles = ipfsNode => {
    // The IPFS daemon is running, and the IPFS node is now ready to use.
    return new Promise((resolve, reject) => {
      glob('**/*', {
        cwd: deployPath,
        dot: true,
        nodir: true,
        ignore: [
          '.git/**',
          'node_modules/**',
          'ipfs/**'
        ]
      }, (err, files) => {
        if (err || !files) {
          reject(new Error('Could not find public files to deploy'));
          return;
        }
        resolve(files);
      });
    }).then(files => {
      const crypto = require('crypto');
      let hash = crypto.createHash('sha256');
      let strToHash = '';

      let filesToAddPromises = files.map(filename => {
        return new Promise((resolve, reject) => {
          let file = {
            _realPath: path.join(deployPath, filename),
            path: `${rootDir}/${filename}`,
            content: fs.createReadStream(path.join(deployPath, filename))
          };

          file.content.on('data', data => {
            strToHash += file.path + ';' + data.toString();
          });
          file.content.on('end', () => {
            resolve(file);
          });
          file.content.on('error', reject);
        });
      });

      return Promise.all(filesToAddPromises).then(filesToAdd => {
        hash.update(strToHash);

        const rootDirHash = hash.digest('hex');

        filesToAdd.map(file => {
          file.path = `${rootDirHash}/${file.path}`;
          file.content = fs.createReadStream(file._realPath);
          delete file._realPath;
          return file;
        });

        return ipfsNode.files.add(filesToAdd);
      });
    }).then(filesAdded => {
      const dirMultihash = filesAdded[filesAdded.length - 1].hash;
      const numFiles = filesAdded.length - 1;
      logger.info(`Successfully published directory "${deployPath}" (file${numFiles === 1 ? '' : 's'}) to IPFS: ${dirMultihash}`);
      const deployedUrl = `https://ipfs.io/ipfs/${dirMultihash}/${rootDir}/`;
      return deployedUrl;
    }, err => {
      logger.error('Error adding to IPFS:', err);
    });
  };

  let ipfsNode = null;
  return new Promise((resolve, reject) => {
    let ipfsNodeReady = false;
    logger.info('Starting IPFS node');
    ipfsNode = new IPFS();
    ipfsNode.on('ready', () => {
      logger.info('IPFS node is ready');
      ipfsNodeReady = true;
      resolve(ipfsAddFiles(ipfsNode));
    });
    ipfsNode.on('error', err => {
      ipfsNodeReady = true;
      reject(new Error('Error occurred with IPFS node: ' + err));
    });
    setTimeout(() => {
      if (!ipfsNodeReady) {
        reject(new Error(`Could not connect to IPFS node (timed out after ${options.timeout / 1000} seconds)`));
      }
    }, options.timeout);
  }).then(deployedUrl => new Promise((resolve, reject) => {
    if (deployedUrl) {
      logger.log(`Deployed project to ${deployedUrl}`);
      // Copy to the user's clipboard the URL of the deployed project.
      if (!options.noClipboard) {
        clipboardy.writeSync(deployedUrl);
      }
      if (!options.noOpen) {
        // opn(deployedUrl, {wait: false});
      }
      if (!options.noSubmit) {
        submitToIndex(deployedUrl);
      }
    }

    logger.info(`Keeping IPFS node open (for ${options.disconnectTimeout / 1000} seconds)`);

    let ipfsNodeStopped = false;

    setTimeout(() => {
      logger.info('Stopping IPFS node');

      ipfsNode.stop();
      ipfsNode = null;

      logger.info('IPFS node stopped');

      resolve(deployedUrl);

      setTimeout(() => {
        if (ipfsNode) {
          reject(new Error(`Could not stop IPFS node (timed out after ${options.timeout / 1000} seconds)`));
        }
      }, options.timeout);

      if (!ipfsNode) {
        process.exit();
      }
    }, options.disconnectTimeout);
  }));
};

exports.deploy = deploy;
exports.deployToIPFS = deployToIPFS;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
