const path = require('path');

const fs = require('fs-extra');
const install = require('deps-install');
const logger = require('loggy');

const cleanURL = require('./clean-url.js');
const printBanner = require('./print-banner.js');

const defaultCommandName = 'aframe new';

const initTemplate = (templateAlias, options) => {
  options = options || {};

  const cwd = process.cwd();

  const rootPath = path.resolve(options.rootPath || cwd).trim();
  const commandName = options.commandName || defaultCommandName;

  if (!templateAlias || typeof templateAlias !== 'string' ||
      templateAlias.charAt(0) === '.' && rootPath === cwd) {
    printBanner(defaultCommandName);
    process.exit(1);
  }

  const copyTemplateDir = (template, dir) => {
    logger.log(`Using template "${template}" …`);

    const filter = filepath => !/^\.(git|hg|svn)$/.test(path.basename(filepath));
    logger.log(`Copying local template to "${rootPath}" …`);

    // TODO: Perhaps have `rootPath` default to `my-aframe-project`.
    return fs.copy(dir, rootPath, {errorOnExist: true, filter}).then(() => {
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
    return copyTemplateDir(templateAlias, templateDir);
  }

  const localTemplateAlias = `aframe-${templateAlias}-template`;
  const localTemplateDir = path.join(__dirname, '..', 'templates', localTemplateAlias);

  if (fs.existsSync(localTemplateDir)) {
    return copyTemplateDir(localTemplateAlias, localTemplateDir);
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
