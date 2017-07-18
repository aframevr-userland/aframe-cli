const path = require('path');

const fs = require('fs-extra');
const objectAssignDeep = require('lodash.merge');

const templatesJson = require('../templates/index.json');

const pkgDefault = {
  scripts: {
    build: 'aframe build',
    serve: 'aframe serve'
  }
};

module.exports.getBrunchConfigPath = (projectDir, options) => {
  options = options || {};
  projectDir = projectDir || options.projectDir || process.cwd();

  if (options.config && fs.existsSync(options.config)) {
    return path.resolve(options.config);
  }

  const brunchConfigPath = path.join(projectDir, 'brunch-config.js');

  return fs.existsSync(brunchConfigPath) ? brunchConfigPath : path.join(__dirname, 'brunch-config.js');
};

module.exports.readPackage = pkgPath => {
  pkgPath = pkgPath || process.cwd();
  if (!pkgPath.endsWith('package.json')) {
    pkgPth = path.join(pkgPath, 'package.json');
  }
  return fs.readJson(pkgPth).then(pkgObj => {
    return objectAssignDeep({}, pkgDefault, pkgObj, {package: true});
  }, () => {
    return objectAssignDeep({}, pkgDefault, {default: true});
  });
};

module.exports.mergePackage = (filename, data) => {
  return fs.readJson(filename).then(manifest => {
    return objectAssignDeep({}, manifest, data);
  }).catch(data => {
    return data || {};
  }).then(data => {
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
  return (argv || [])
    .filter(arg => fs.existsSync(arg))
    .map(arg => path.resolve(arg));
};

module.exports.pkgDefault = pkgDefault;
module.exports.getPkgDefault = () => {
  return pkgDefault;
};
