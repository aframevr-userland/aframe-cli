#!/usr/bin/env node
process.on('unhandledRejection', err => {
  throw err;
});
process.on('SIGINT', () => {
  process.exit();
});
process.on('SIGTERM', () => {
  process.exit();
});

const program = require('commander');

const commands = require('./commands/index.js');
const pkg = require('../package.json');

program
  .version(pkg.version, '-v, --version')
  .usage('[command] [options]');

program
  .command('new [path]')
  .alias('n')
  .description('Create a new A-Frame project in path.')
  .option('-t, --template [name]', 'template name or URL from https://aframe.io/templates')
  .on('--help', () => {
    require('./lib/init-template.js').printBanner('aframe new -t');
  })
  .action(commands.new);

program.parse(process.argv);
