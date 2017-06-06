const ghPagesDeploy = require('../lib/deploy-github-pages.js').deploy;

module.exports = provider => {
  const providerToUse = require('../lib/utils').getDeployProvider(provider, );

  switch (providerToUse) {
    case 'github-pages':
    default:
      return ghPagesDeploy;
  }
};
