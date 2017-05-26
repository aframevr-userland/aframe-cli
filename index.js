#!/usr/bin/env node
// process.on('unhandledRejection', err => {
//   throw err;
// });
// process.on('SIGINT', () => {
//   process.exit();
// });
// process.on('SIGTERM', () => {
//   process.exit();
// });

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
    require('./lib/init-template.js').printBanner('aframe new --template');
  })
  .action(commands.new);

let args = process.argv.slice();
const command = args[2];

args[1] = 'aframe';

program.parse(args);

// const validCommand = program.commands.some(cmd => {
//   return cmd.name() === command || cmd.alias() === command;
// });

// if (!validCommand) {
//   program.help();
//   process.exit(1);
// }
