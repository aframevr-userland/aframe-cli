const exec = require('child_process').exec;
const path = require('path');

const brunch = require('brunch');
const chalk = require('chalk');
const clipboardy = require('clipboardy');
const fs = require('fs-extra');
const ghauth = require('ghauth');
const GitHubApi = require('github');
const install = require('deps-install');
const logger = require('loggy');
const opn = require('opn');

const cleanURL = require('./clean-url.js');
const printBanner = require('./print-banner.js');

const defaultCommandName = 'aframe new';
const defaultProjectName = 'aframe-scene';
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

  const projectName = options.name || path.basename(rootPath);

  const openProjectDir = projectDir => {
    if (options['no-open']) {
      return false;
    }

    process.chdir(projectDir || rootPath);
  };

  const ghLoadProjectPage = (ghPath, timeout) => new Promise((resolve, reject) => {
    const ghUrl = `https://github.com/${ghPath}`;

    clipboardy.writeSync(ghUrl);

    if (options['no-github-open']) {
      return Promise.resolve(false);
    }

    setTimeout(() => {
      opn(ghUrl, {wait: false})
      .then(resolve)
      .catch(reject);
    }, timeout || 500);
  });

  const pkgJsonPath = path.join(rootPath, 'package.json');

  const rewritePkgJson = pkgObj => new Promise((resolve, reject) => {
    // Rewrite the `package.json` file for the newly created project.

    if (!pkgObj.aframe) {
      pkgObj.aframe = {};
    }
    if (!pkgObj.aframe.basedOn) {
      pkgObj.aframe.basedOn = {};
    }
    pkgObj.aframe.basedOn[pkgObj.name] = pkgObj.version;
    pkgObj.aframe.keywords = (pkgObj.aframe.keywords || []).concat([
      projectName,
      'aframe',
      'aframe-scene',
      pkgObj.name,
      'webvr',
      'vr',
    ]);

    pkgObj.name = projectName;
    pkgObj.version = '0.0.0';
    pkgObj.private = true;

    fs.writeJson(pkgJsonPath, pkgObj);

    return pkgObj;
  });

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
    () => fs.readJson(pkgJsonPath)
  ).then(
    pkgObj => rewritePkgJson
  ).then(pkgObj => new Promise((resolve, reject) => {

    if (!options.github) {
      return resolve(false);
    }

    let ghOrgOrUser;
    let ghOrg;
    let ghName = projectName;
    // let ghName = pkgObj.name || defaultGitHubRepoName || defaultProjectName;
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
            ghLoadProjectPage(ghPath);
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

      resolve(ghPath);
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

      exec(`git remote add origin git@github.com:${ghPath}.git`, (err, stdout, stderr) => {
        if (err) {
          if (!silent) {
            logger.error(`Error setting the remote repo URL for GitHub repo "${ghPath}": ${err}`);
          }

          reject(err);
          return;
        }

        resolve(ghPath);

        // exec(`git branch --set-upstream-to=origin/master master`, (err, stdout, stderr) => {
        //   if (err) {
        //     if (!silent) {
        //       logger.error(`Error setting the remote repo URL for GitHub repo "${ghPath}": ${err}`);
        //     }
        //
        //     reject(err);
        //     return;
        //   }
        //
        //   resolve(ghPath);
        // });
      });
    });
  })).then(ghPath => new Promise((resolve, reject) => {
    logger.log(`Finished creating GitHub repo: ${chalk.bold.green.underline(`https://github.com/${ghPath}`)}`);

    openProjectDir(rootPath);

    ghLoadProjectPage(ghPath);
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

    // TODO: Perhaps have `rootPath` default to `my-aframe-project` (or `defaultProjectName`).
    return fs.copy(templateDir, rootPath, {errorOnExist: true, filter}).then(() => {
      const pkgType = ['package', 'bower'];
      try {
        install({
          rootPath,
          pkgType,
          logger
        });
      } catch (err) {
        throw err;
      }
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
