const path = require('path');

const logger = require('loggy');

module.exports = (rootPath, options) => {
  options = options || {};

  const initTemplate = require('../lib/init-template.js').init;
  const template = options.template || 'aframe-default-template';

  rootPath = rootPath || options.parent.args[0];

  return initTemplate(template, {
    logger,
    rootPath,
    commandName: 'aframe new'
  });
};
