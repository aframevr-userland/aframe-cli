// Adapted from source: https://github.com/mozilla-neutrino/neutrino-dev/blob/master/.scripts/publish
const { execSync } = require('child_process');
const { join } = require('path');
const { readdirSync } = require('fs');

const Graph = require('graph-data-structure');
const logger = require('loggy');
const semver = require('semver');

const programName = 'aframe-cli';

module.exports = version => {
  if (!version || !semver.valid(version)) {
    logger.error('The "version" argument passed was either missing or invalid (semver)');
    process.exit(1);
  }

  execSync(`npm whoami`, {stdio: 'inherit', cwd: process.cwd()});

  logger.log('Publishing templates to npm');
  logger.log(`Version ${version}`);

  execSync(`oao reset-all-versions ${version}`, {stdio: 'inherit'});

  const packagesDir = join(__dirname, '..', 'templates');
  const packages = readdirSync(packagesDir);
  const graph = packages.reduce((graph, pkg) => {
    if (!pkg.startsWith('aframe-') || !pkg.endsWith('-template')) {
      return graph;
    }

    graph.addNode(pkg);
    graph.addEdge(programName, pkg);

    Object
      .keys(require(join(packagesDir, `${pkg}/package.json`)).dependencies)
      .filter(dep => dep.includes(programName))
      .forEach(dep => graph.addEdge(dep, pkg));

    return graph;
  }, new Graph());

  graph
    .topologicalSort()
    .forEach(pkgName => {
      logger.log(`Publishing ${pkgName}@${version}`);

      const cwd = pkgName === programName ? join(__dirname, '..') : join(packagesDir, pkgName);

      // const pkgJson = join(cwd, 'package.json');
      // const pkg = require(pkgJson);
      // const upgradedDeps = Object
      //   .keys(pkg.dependencies)
      //   .filter(dep => dep.includes('aframe-'));

      // if (upgradedDeps.length) {
      //   const upgradeCommand = `oao upgrade --src templates ${pkgName} ${upgradedDeps.join(' ')}`;
      //   logger.info(`  ${upgradeCommand}`);
      //   execSync(upgradeCommand, {cwd});
      // }
      execSync(`npm publish`, {stdio: 'inherit', cwd});
    });
};
