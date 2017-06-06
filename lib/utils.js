const path = require('path');

const fs = require('fs-extra');

const deployProviders = {
  'github-pages': true
};
const defaultDeployProvider = 'github-pages';

const getBrunchConfigPath = module.exports.getBrunchConfigPath = (filePath, options) => {
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

module.exports.getBrunchConfig = (filePath, options) => {
  return require(getBrunchConfigPath(filePath, options));
};

module.exports.getDeployProviders = deployProviders;

module.exports.getDeployProvider = (provider, defaultProvider) => {
  provider = (provider || '').trim().toLowerCase();

  if (provider in deployProviders) {
    return provider;
  }

  if (provider.startsWith('gh') || provider.endsWith('pages')) {
    return 'github-pages';
  }

  if (defaultProvider) {
    return defaultProvider in deployProviders ? defaultProvider : defaultDeployProvider;
  }
};
