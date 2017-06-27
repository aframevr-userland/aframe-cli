const path = require('path');

const brunch = require('brunch');
const clipboardy = require('clipboardy');
const fs = require('fs-extra');
const glob = require('glob');
const logger = require('loggy');
const opn = require('opn');

const getBrunchConfigPath = require('./utils.js').getBrunchConfigPath;

const deploy = (deployPath, options, onCompile) => {
  deployPath = deployPath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(deployPath, options);
  logger.log(`Deploying "${deployPath}" …`);

  // const build = require('./build.js').build;
  // return build(deployPath, options).then(() => {
  // });

  let builtPath = null;
  try {
    deployPath = builtPath = path.resolve(deployPath, require(options.config).paths.public);
  } catch (err) {
  }

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
      if (deployedUrl) {
        logger.log(`Deployed to ${deployedUrl}`);
        // Copy to the user's clipboard the URL of the deployed project.
        clipboardy.writeSync(deployedUrl);
        opn(deployedUrl, {wait: false});
        process.exit();
        return deployedUrl;
      }
      throw new Error('Unknown error occurred');
    });
  }).catch(err => {
    if (err) {
      logger.error(`Could not deploy "${deployPath}":`, err);
    } else {
      logger.error(`Could not deploy "${deployPath}"`);
    }
    throw err;
    process.exit(1);
  });
};

const deployToIPFS = (options, deployPath, rootDir, pkgObj) => {
  const IPFS = require('ipfs-daemon');

  const ipfsAddFiles = ipfsNode => {
    // The IPFS daemon is running, and this IPFS node is now ready to use.
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
      let filesToAdd = files.map(file => {
        return {
          path: `${rootDir}/${file}`,
          content: fs.createReadStream(path.join(deployPath, file))
        };
      });
      return ipfsNode.files.add(filesToAdd);
    }).then(filesAdded => {
      const dirMultihash = filesAdded[filesAdded.length - 1].hash;
      const numFiles = filesAdded.length - 1;
      logger.info(`Successfully published directory "${deployPath}" (file${numFiles === 1 ? '' : 's'}) to IPFS: ${dirMultihash}`);
      const deployedUrl = `https://ipfs.io/ipfs/${dirMultihash}/`;
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
        reject(new Error('Could not connect to IPFS node (timed out after 3 seconds)'));
      }
    }, options.timeout);
  }).then(deployedUrl => new Promise((resolve, reject) => {
    logger.info('Stopping IPFS node');
    let ipfsNodeStopped = false;
    ipfsNode.stop();
    ipfsNode = null;
    logger.info('IPFS node stopped');
    resolve(deployedUrl);
    setTimeout(() => {
      if (ipfsNode) {
        reject(new Error('Could not stop IPFS node (timed out after 3 seconds)'));
      }
    }, options.timeout);
  }));
};

exports.deploy = deploy;
exports.deployToIPFS = deployToIPFS;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
    // console.log(err.message);
  // });
};
