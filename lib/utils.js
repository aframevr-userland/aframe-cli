const path = require('path');

const deepAssign = require('deep-assign');
const fs = require('fs-extra');
const logger = require('loggy');

const templatesJson = require('../templates/index.json');

module.exports.getBrunchConfigPath = (projectDir, options) => {
  options = options || {};
  projectDir = projectDir || options.projectDir || process.cwd();

  if (options.config && fs.existsSync(options.config)) {
    return path.resolve(options.config);
  }

  let brunchConfigPath = path.join(projectDir, 'brunch-config.js');

  return fs.existsSync(brunchConfigPath) ? brunchConfigPath : path.join(__dirname, 'brunch-config.js');
};

module.exports.mergeManifest = (filename, data) => {
  return fs.readJson(filename).then(manifest => {
    return deepAssign({}, manifest, data);
  }).catch(data => {
    return data || {};
  }).then(data => {
    logger.log(`Updated manifest "${filename}"`);
    return fs.writeJson(filename, data);
  });
};

module.exports.templates = templatesJson && templatesJson.templates ? templatesJson.templates : [];

module.exports.templatesByAlias = {};
module.exports.templatesByUrl = {};

module.exports.templates.forEach(template => {
  module.exports.templatesByAlias[template.alias] = template;
  module.exports.templatesByUrl[template.url] = template;
});

module.exports.getTemplateByAliasOrUrl = aliasOrUrl => {
  return module.exports.templatesByAlias[aliasOrUrl] || module.exports.templatesByUrl[aliasOrUrl || null];
};

module.exports.getArgvPaths = argv => {
  return argv
    .filter(arg => fs.existsSync(arg))
    .map(arg => path.resolve(arg));
};
