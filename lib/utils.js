const path = require('path');

const fs = require('fs-extra');

module.exports.getBrunchConfigPath = (filePath, options) => {
  filePath = filePath || process.cwd();
  options = options || {};

  if (options.config) {
    return options.config;
  }

  let brunchConfigPath = path.join(filePath, 'brunch-config.js');
  if (fs.existsSync(brunchConfigPath)) {
    return brunchConfigPath;
  }

  return path.join(__dirname, 'brunch-config.js');
};
