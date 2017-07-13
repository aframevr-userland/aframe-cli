const path = require('path');

const deepAssign = require('deep-assign');
const fs = require('fs-extra');
const logger = require('loggy');

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
