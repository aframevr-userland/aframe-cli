const path = require('path');

const fs = require('fs-extra');
const objectAssignDeep = require('lodash.merge');

const templatesJson = require('../templates/index.json');

const pkgDefault = {
  scripts: {
    build: 'aframe build',
    serve: 'aframe serve',
    deploy: 'aframe deploy'
  }
};

module.exports.templates = templatesJson && templatesJson.templates ? templatesJson.templates : [];

module.exports.templatesByAlias = {};
module.exports.templatesByUrl = {};

module.exports.templates.forEach(template => {
  module.exports.templatesByAlias[template.alias] = template;
  module.exports.templatesByUrl[template.url] = template;
});

const getTemplateByAliasOrUrl = module.exports.getTemplateByAliasOrUrl = aliasOrUrl => {
  return module.exports.templatesByAlias[aliasOrUrl] || module.exports.templatesByUrl[aliasOrUrl] || null;
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

module.exports.getBrunchConfigPath = (projectDir, options) => {
  options = options || {};
  projectDir = projectDir || options.projectDir || process.cwd();

  if (options.config && fs.existsSync(options.config)) {
    return path.resolve(options.config);
  }

  const brunchConfigPath = path.join(projectDir, 'brunch-config.js');

  return fs.existsSync(brunchConfigPath) ? brunchConfigPath : path.join(__dirname, 'brunch-config.js');
};

const getPackagePath = module.exports.getPackagePath = pkgPath => {
  pkgPath = pkgPath || process.cwd();
  if (!pkgPath.endsWith('package.json')) {
    pkgPath = path.join(pkgPath, 'package.json');
  }
  return pkgPath;
};

const readPackage = module.exports.readPackage = (pkgPath, data) => {
  pkgPath = getPackagePath(pkgPath);
  return fs.readJson(pkgPath).then(pkgObj => {
    return objectAssignDeep({}, pkgDefault, pkgObj, data);
  }, () => {
    return objectAssignDeep({}, pkgDefault, data);
  });
};

const createOrReadPackage = module.exports.createOrReadPackage = pkgPath => {
  pkgPath = getPackagePath(pkgPath);
  return fs.ensureFile(pkgPath)
    .then(next)
    .catch(next);
  function next () {
    return readPackage(pkgPath);
  }
};

module.exports.mergePackage = (pkgPath, data) => {
  pkgPath = getPackagePath(pkgPath);
  return readPackage(pkgPath, data).then(pkgObj => {
    return fs.writeJson(pkgPath, pkgObj);
  });
};

module.exports.initPackageFromTemplate = (pkgPath, templateName, data) => {
  const gitUsername = require('git-user-name');
  const template = (templateName && getTemplateByAliasOrUrl(templateName)) || templatesByAlias.default;
  return readPackage(path.join(__dirname, 'templates', template, 'package.json')).then(pkgTemplate => {
    let pkg = objectAssignDeep({}, pkgTemplate, data);
    pkg.name = path.basename(pkgPath);
    pkg.description = 'A WebVR scene made with A-Frame';
    pkg.author = '';
    pkg.version = '0.0.0';
    delete pkg.repository;
    // return fs.readJson(filename).then(manifest => {
    //   return objectAssignDeep({}, manifest, data);
    // }).catch(data => {
    //   return data || {};
    // }).then(data => {
    //   return fs.writeJson(filename, data);
    // });
    return pkg;
  });
};
