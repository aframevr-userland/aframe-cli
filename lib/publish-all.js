// NOTE: This is a WIP.
// Adapted from source: https://github.com/mozilla-neutrino/neutrino-dev/blob/master/.scripts/publish
const { execSync } = require('child_process');
const { join, resolve } = require('path');
const { readdirSync } = require('fs');

const Graph = require('graph-data-structure');
const logger = require('loggy');
const semver = require('semver');

const argv = process.argv.slice(2);
const programName = 'aframe-cli';

module.exports = (version, rootDir) => {
  const versionPassed = version;

  rootDir = rootDir ? resolve(rootDir) : join(__dirname, '..');
  const programVersion = require(join(rootDir, 'package.json')).version;

  if (programVersion === versionPassed ||
      (versionPassed && !semver.valid(versionPassed))) {
    logger.error('The "version" argument passed was either missing or invalid (semver)');
    process.exit(1);
  }

  execSync(`npm whoami`, {stdio: 'inherit', cwd: rootDir});

  if (versionPassed) {
    execSync(`npm version ${versionPassed}`, {stdio: 'inherit', cwd: rootDir});
  } else if (argv.includes('--major')) {
    execSync('npm version major', {stdio: 'inherit', cwd: rootDir});
  } else if (argv.includes('--minor')) {
    execSync('npm version minor', {stdio: 'inherit', cwd: rootDir});
  } else {
    execSync('npm version patch', {stdio: 'inherit', cwd: rootDir});
  }

  logger.log('Publishing templates to npm');

  version = require(join(rootDir, 'package.json')).version;

  logger.log(`Version ${version}`);

  execSync(`oao reset-all-versions ${version} --no-confirm`, {stdio: 'inherit'});

  const packagesDir = join(rootDir, 'templates');
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

      const cwd = pkgName === programName ? rootDir : join(packagesDir, pkgName);

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

      if (pkgName === programName) {
        execSync(`git push --tags`, {stdio: 'inherit', cwd});
      } else {
        execSync(`yarn install`, {stdio: 'inherit', cwd});
        execSync(`yarn upgrade ${programName}@${version} --dev`, {stdio: 'inherit', cwd});
        execSync(`npm version ${version}`, {stdio: 'inherit', cwd: rootDir});
        execSync(`git push --tags`, {stdio: 'inherit', cwd});
      }

      execSync(`npm publish`, {stdio: 'inherit', cwd});
    });
};
