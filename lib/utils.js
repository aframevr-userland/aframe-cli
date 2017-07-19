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

let templatesByAlias = module.exports.templatesByAlias = {};
let templatesByUrl = module.exports.templatesByUrl = {};

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
  projectDir = projectDir || options.directory || process.cwd();

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
  let pkgObj = null;
  try {
    pkgObj = require(pkgPath);
  } catch (err) {
  }
  return Promise.resolve(objectAssignDeep({}, pkgObj, data));
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

module.exports.rewritePackage = (pkgPath, options) => {
  pkgPath = getPackagePath(pkgPath);
  options = options || {force: false};

  const gitConfigPath = require('git-config-path');
  const parseGitConfig = require('parse-git-config');

  let user = '';
  let email = '';
  let repository = '';
  let projectDir = path.dirname(pkgPath);

  let projectDirBasename = path.basename(projectDir);

  const gitConfig = parseGitConfig.sync({path: gitConfigPath('global')});

  if (gitConfig) {
    if (gitConfig.user) {
      if (gitConfig.user.name) {
        user = gitConfig.user.name;
      }
      if (gitConfig.email) {
        email = gitConfig.user.email;
        if (user) {
          user = email;
        } else {
          user += `${user} <${email}>`;
        }
      }
    }
    if (gitConfig.github && gitConfig.github.user) {
      repository = `${gitConfig.github.user}/${projectDirBasename}`;
    }
  }

  return readPackage(pkgPath).then(pkgProject => {
    if (options.force || !fs.existsSync(pkgPath) || (pkgProject.aframe && pkgProject.aframe.template_master)) {
      return rewrite(pkgProject, (pkgProject.aframe && pkgProject.aframe.template) || 'default');
    }
    return pkgProject;
  });

  function rewrite (templateName) {
    templateName = templateName || 'default';

    const template = (templateName && getTemplateByAliasOrUrl(templateName)) || templatesByAlias.default;
    const pkgTemplatePath = path.join(__dirname, '..', 'templates', template.url, 'package.json');

    let pkg = {};

    return readPackage(pkgTemplatePath).then(pkgTemplate => {
      let pkgNew = {
        name: projectDirBasename,
        description: 'A WebVR scene made with A-Frame',
        version: '0.0.0',
        license: 'CC0-1.0',
        keywords: [
          'aframe',
          'aframevr',
          template.url,
          'webvr',
          'vr'
        ]
      };
      if (user) {
        pkgNew.author = user;
      }
      if (repository) {
        pkgNew.repository = repository;
      }

      pkg = objectAssignDeep({}, pkgTemplate, pkgNew);

      if (pkg.aframe) {
        delete pkg.aframe.template_master;
        if (user) {
          pkg.aframe.author = user;
        }
      }

      return fs.writeJson(pkgPath, pkg, {spaces: 2});
    }).then(() => {
      return pkg;
    });
  }
};

module.exports.createGitignore = (projectDir, options) => {
  options = options || {force: false};
  projectDir = projectDir || options.directory || process.cwd();

  const gitignorePath = path.join(projectDir, '.gitignore');

  if (options.force || !fs.existsSync(gitignorePath)) {
    return fs.copy(path.join(__dirname, '..', '.gitignore'), gitignorePath).then(() => {
      return gitignorePath;
    });
  } else {
    return Promise.resolve(gitignorePath);
  }
};
