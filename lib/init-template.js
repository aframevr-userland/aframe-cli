const exec = require('child_process').exec;
const path = require('path');

const brunch = require('brunch');
const chalk = require('chalk');
const fs = require('fs-extra');
const ghauth = require('ghauth');
const GitHubApi = require('github');
const install = require('deps-install');
const logger = require('loggy');
const opn = require('opn');

const cleanURL = require('./clean-url.js');
const printBanner = require('./print-banner.js');

const defaultCommandName = 'aframe new';
const defaultGitHubRepoName = 'aframe-scene';
const defaultTemplateAlias = 'aframe-default-template';
const defaultTemplateUrl = `aframevr-userland/${defaultTemplateAlias}`;

const postInstall = (templateAlias, rootPath, options, silent) => {
  const github = new GitHubApi({
    debug: options.debug
  });

  if (typeof silent === 'undefined') {
    silent = 'silent' in options;
  }

  if (!options.git && !options.github) {
    return Promise.resolve(false);
  }

  const cwd = process.cwd();

  if (cwd !== rootPath) {
    process.chdir(rootPath);
  }

  return new Promise((resolve, reject) => {
    exec('git init .', (err, stdout, stderr) => {
      if (err) {
        if (!silent) {
          logger.error(`Unexpected error: ${err}`);
        }

        reject(err);
        return;
      }

      if (stderr) {
        if (!silent) {
          logger.error(`Error: ${stderr}`);
        }

        reject(stderr);
        return;
      }

      if (!silent && stdout) {
        logger.info(`Output: ${stdout}`);
      }

      resolve(stdout);
    });
  }).then(
    () => fs.readJson(path.join(rootPath, 'package.json'))
  ).then(pkgObj => new Promise((resolve, reject) => {
    // console.log('creating GitHub repo: inner');

    if (!options.github) {
      return resolve(false);
    }

    let ghOrgOrUser;
    let ghOrg;
    let ghName = pkgObj.name || defaultGitHubRepoName;
    let ghPath;
    let ghDescription = pkgObj.description;

    if (typeof options.github === 'string') {
      const ghChunks = options.github.trim().split('/');
      if (ghChunks.length < 2) {
        ghName = options.github;
      } else {
        ghOrg = ghChunks[0];
        ghName = ghChunks[1];
      }
    } else if (ghName && ghName.startsWith('aframe-') && ghName.endsWith('-template')) {
      ghName = ghName.replace(/-template$/, '-scene');
    }

    const ghLoadProjectPage = (ghPathUrl, timeout) => new Promise((resolve, reject) => {
      setTimeout(() => {
        opn(`https://github.com/${ghPathUrl || ghPath}`, {
          wait: false
        })
        .then(resolve)
        .catch(reject);
      }, timeout || 500);
    });

    const ghCreatedRepo = (err, res) => {
      if (err) {
        if (!err.message || err.message[0] !== '{') {
          throw err;  // This is not a JSON response.
        }

        err = JSON.parse(err.message);

        if (err.errors && err.errors[0]) {
          if (err.errors[0].resource === 'Repository' &&
              err.errors[0].field === 'name' &&
              err.errors[0].message.match(/name already exists/i)) {
            logger.warn(`Skipped creating already-existent GitHub repo "${ghPath}"`);
            ghLoadProjectPage();
          } else {
            if (!silent) {
              logger.error(`Error creating GitHub repo "${ghPath}": ${err.errors[0].message}`);
            }
          }
        }

        reject(err);
        return;
      }

      if (!silent) {
        logger.log(`Created GitHub repo "${ghPath}"`);
      }

      resolve(res);
    };

    ghauth({
      configName: 'create-repository',
      scopes: [
        'repo'
      ]
    }, (err, auth) => {
      if (err) {
        if (!silent) {
          logger.error(`Error authenticating with GitHub to create repo "${ghName}": ${err}`);
        }

        reject(err);
        return;
      }

      github.authenticate({
        type: 'oauth',
        token: auth.token
      });

      ghOrgOrUser = ghOrg || auth.user;
      ghPath = `${ghOrgOrUser}/${ghName}`;

      if (ghOrg) {
        github.repos.createForOrg({
          org: ghOrg,
          name: ghName,
          description: ghDescription
        }, ghCreatedRepo);
      } else {
        github.repos.create({
          name: ghName,
          description: ghDescription
        }, ghCreatedRepo);
      }
    });
  })).then(ghPath => new Promise((resolve, reject) => {
    logger.log(`Repository created https://github.com/${ghPath}`);

    exec('git remote', (err, stdout, stderr) => {
      if (err) {
        if (!silent) {
          logger.error(`Error getting the remote repo URL for GitHub repo "${ghPath}": ${err}`);
        }

        reject(err);
        return;
      }

      if (stdout.indexOf('origin') > -1) {
        // Don't set the remote URL for `origin` if one is already set.
        resolve(ghPath);
        return;
      }

      exec(`git remote add origin git@github.com:${ghOrgOrUser}/${ghName}.git`, (err, stdout, stderr) => {
        if (err) {
          if (!silent) {
            logger.error(`Error setting the remote repo URL for GitHub repo "${ghPath}": ${err}`);
          }

          reject(err);
          return;
        }

        exec(`git branch --set-upstream master origin/master`, (err, stdout, stderr) => {
          if (err) {
            if (!silent) {
              logger.error(`Error setting the remote repo URL for GitHub repo "${ghPath}": ${err}`);
            }

            reject(err);
            return;
          }

          resolve(ghPath);
        });
      });
    });
  })).then(ghPath => new Promise((resolve, reject) => {
    logger.log(`Finished creating GitHub repo: ${chalk.bold.green.underline(`https://github.com/${ghPath}`)}`);
    ghLoadProjectPage();
  })).then(() => {
    return Promise.resolve(rootPath);
  });
};

const initTemplate = (templateAlias, options) => {
  options = options || {};

  const cwd = process.cwd();

  const rootPath = path.resolve(options.rootPath || cwd).trim();
  const commandName = options.commandName || defaultCommandName;

  if (!templateAlias || typeof templateAlias !== 'string' ||
      templateAlias.charAt(0) === '.' && rootPath === cwd) {
    return printBannerAndExit(commandName);
  }

  const copyTemplateDir = () => {
    logger.log(`Using template "${templateAlias}" …`);

    const filter = filepath => !/^\.(git|hg|svn)$/.test(path.basename(filepath));
    logger.log(`Copying local template to "${rootPath}" …`);

    // TODO: Perhaps have `rootPath` default to `my-aframe-project`.
    return fs.copy(templateDir, rootPath, {errorOnExist: true, filter}).then(() => {
      const pkgType = ['package', 'bower'];
      try {
        // install({
        //   rootPath,
        //   pkgType,
        //   logger
        // });
        logger.info('install done');
      } catch (err) {
        throw err;
        logger.info('install error');
      }
      logger.info('before postInstall');
      return postInstall(templateAlias, rootPath, options);
    });
  };

  let templateDir = path.join(__dirname, '..', 'templates', templateAlias);

  if (fs.existsSync(templateDir)) {
    return copyTemplateDir();
  }

  templateAlias = `aframe-${templateAlias}-template`;
  templateDir = path.join(__dirname, '..', 'templates', templateAlias);

  if (fs.existsSync(templateDir)) {
    return copyTemplateDir();
  }

  if (templateAlias.indexOf('/') === -1 && templateAlias.startsWith('aframe-')) {
    templateAlias = 'aframevr-userland/' + templateAlias;
  }

  const initSkeleton = require('init-skeleton').init;

  logger.log(`Using template "${templateAlias}" …`);

  return initSkeleton(templateAlias, {
    logger,
    rootPath,
    commandName
  }).then(() => {
    return postInstall(templateAlias, rootPath, options);
  });
};

exports.init = initTemplate;
exports.cleanURL = cleanURL;
exports.printBanner = commandName => {
  return printBanner(commandName).catch(err => {
    // console.log(err.message);
  });
};
