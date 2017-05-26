const path = require('path');

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

  return initTemplate(template, {
    logger,
    rootPath,
    commandName: 'aframe new'
  });
};
