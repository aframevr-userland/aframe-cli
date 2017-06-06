const ghpages = require('gh-pages');
const path = require('path');

const deploy = (filePath, options) => {
  filePath = filePath || process.cwd();
  options = options || {};
  options.config = options.config || getBrunchConfigPath(filePath, options);

  logger.log(`Deploying project "${filePath}" …`);

  logger.info('Building project …');

  try {
    return brunch.build(filePath, options).then(() => {
      let brunchConfig = {
        paths: {
          public: '.public'
        }
      };
      try {
        brunchConfig = require(options.config);
      } catch (e) {
      }
      const prodSrcDir = brunchConfig.paths.public;

      logger.info(`Pushing "${prodSrcDir}" to GitHub Pages …`);

      let ghpagesOpts = {
        src: prodSrcDir,
        branch: 'gh-pages',
        silent: options.silent
      };

      if (typeof options.repo === 'string' && options.repo) {
        ghpagesOpts.repo = options.repo;
      }
      if (typeof options.github === 'string' && options.github &&
          options.github.indexOf('/') > -1) {
        ghpagesOpts.repo = options.github;
      }

      ghpages.publish(ghpagesOpts, (err, data) => {
        if (err) {
          throw err;
        }
        console.log(data);
      });
    });
  } catch (err) {
    logger.error(`Could not build "${filePath}" …`);
    throw err;
  }
};

exports.deploy = deploy;
exports.printBanner = commandName => {
  // return printBanner(commandName).catch(err => {
  //   console.log(err.message);
  // });
};
