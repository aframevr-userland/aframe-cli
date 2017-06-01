const path = require('path');

const brunch = require('brunch');
const fs = require('fs-extra');
const install = require('deps-install');
const logger = require('loggy');

const cleanURL = require('./clean-url.js');
const printBanner = require('./print-banner.js');

const defaultCommandName = 'aframe new';
const defaultTemplateAlias = 'aframe-default-template';
const defaultTemplateUrl = `aframevr-userland/${defaultTemplateAlias}`;

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
  });
};

exports.init = initTemplate;
exports.cleanURL = cleanURL;
exports.printBanner = commandName => {
  return printBanner(commandName).catch(err => {
    // console.log(err.message);
  });
};
