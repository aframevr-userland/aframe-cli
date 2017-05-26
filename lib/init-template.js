const path = require('path');

const brunch = require('brunch');
const fs = require('fs-extra');
const install = require('deps-install');
const logger = require('loggy');

const cleanURL = require('./clean-url.js');
const printBanner = require('./print-banner.js');

const defaultCommandName = 'aframe new';
const defaultTemplateAlias = 'aframe-default-template';
const defaultTemplateUrl = `aframevr/${defaultTemplateAlias}`;

const printBannerAndExit = commandName => {
  return printBanner(commandName).catch(err => {
    console.log(err.message);
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

  var copyTemplateDir = () => {
    const filter = filepath => !/^\.(git|hg|svn)$/.test(path.basename(filepath));
    logger.log(`Copying local template to "${rootPath}" …`);

    // TODO: Perhaps have `rootPath` default to `my-aframe-project`.
    return fs.copy(templateDir, rootPath, {errorOnExist: true, filter}).then(() => {
      logger.log('Created template directory layout');

      const pkgType = ['package', 'bower'];
      return install({
        rootPath,
        pkgType,
        logger
      });
    });
  };

  let templateDir = path.join(__dirname, '..', 'templates', templateAlias);

  if (fs.existsSync(templateDir)) {
    return copyTemplateDir();
  }

  templateDir = path.join(__dirname, '..', 'templates', `aframe-${templateAlias}-template`);

  if (fs.existsSync(templateDir)) {
    return copyTemplateDir();
  }

  if (templateAlias.indexOf('/') === -1 && templateAlias.startsWith('aframe-')) {
    templateAlias = 'aframevr/' + templateAlias;
  }

  const initSkeleton = require('init-skeleton').init;
  const skeleton = templateAlias;

  return initSkeleton(skeleton, {
    logger,
    rootPath,
    commandName
  });
};

module.exports = {
  init: initTemplate,
  cleanURL,
  printBanner: printBannerAndExit
};
