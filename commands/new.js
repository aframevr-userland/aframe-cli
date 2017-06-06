const path = require('path');

const chalk = require('chalk');
const logger = require('loggy');

const checkLegacyNewSyntax = options => {
  const rawArgs = options.parent.rawArgs;
  const newArgs = rawArgs.slice(rawArgs.indexOf('new') + 1);
  const oldSyntax = !options.template && newArgs.length === 2;
  if (!oldSyntax) { return; }
};

module.exports = (rootPath, options) => {
  options = options || {
    parent: {
      args: []
    }
  };

  const initTemplate = require('../lib/init-template.js').init;
  const template = options.template || 'aframe-default-template';

  rootPath = rootPath || options.parent.args[0];

  const git = options.git;
  const github = options.github;
  const debug = options.debug;

  return initTemplate(template, {
    logger,
    rootPath,
    commandName: 'aframe new',
    git,
    github,
    debug
  }).catch(err => {
    console.log();
    console.error(`  ${chalk.black.bgRed('Encountered error:')}${(err.message ? ` ${chalk.red(err.message)}` : '')}`);
    if (err.stack) {
      console.error(err);
    }
    if (err && err.message && Array.isArray(err.errors) && err.errors.length) {
      console.log();
      err.errors.forEach(error => {
        if (!error.message) {
          return;
        }
        console.log(`${chalk.dim('  - ')}${error.message}`);
      });
      console.log();
    }
  });
};
