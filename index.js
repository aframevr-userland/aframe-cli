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

const path = require('path');

const chalk = require('chalk');
const fs = require('fs-extra');
const program = require('commander');

const commands = require('./commands/index.js');
const pkg = require('./package.json');

const displayHelp = () => program.help(colorizeHelp);  // This calls `process.exit()`.

program
  .version(pkg.version, '-v, --version', 'output the version number')
  .usage('[command] [options]');

program
  .command('serve [path] [options]')
  .alias('s')
  .description('Serve an A-Frame project in path (default: current directory).')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple HTTP server for the public directory on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port [port]', 'if `server` was given, listen on this port')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .action((watchPath, options) => commands.serve(watchPath, options));

program
  .command('build [path]')
  .alias('b')
  .description('Build an A-Frame project in path (default: current directory).')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .action((filePath, options) => commands.build(filePath, options));

program
  .command('new [path]')
  .alias('n')
  .description('Create a new A-Frame project in path.')
  .option('-t, --template [name]', 'template name or URL from https://aframe.io/templates')
  .on('--help', () => {
    require('./lib/init-template.js').printBanner('aframe new --template');
  })
  .action(commands.new);

program
  .command('help', null, {isDefault: true})
  .alias('h')
  .description('Output usage information.')
  .action(displayHelp);

let args = process.argv.slice();
const programName = args[1] = 'aframe';
const helpFlag = args.includes('--help') || args.includes('-h');
const helpCommand = args.includes('help') || args.includes('h');
const help = helpFlag || helpCommand;
let showInvalidMessage = args.length > 2 && !help;

const command = args[2];

const validCommand = program.commands.some(cmd => {
  return cmd.name() === command || cmd.alias() === command;
});

if (!validCommand && !helpCommand) {
  showInvalidMessage = true;
}

const colorizeHelp = txt => {
  // TODO: Figure out how to get `commander` to colorize command help
  // (i.e., the `Usage:` section).
  return txt
    .replace('Usage:  ', `Usage: ${programName} `)
    .replace(new RegExp(`${programName} `, 'g'), `${chalk.cyan(programName)} `)
    .replace(/\[command\] /g, `${chalk.magenta('[command]')} `);
};

if (args.length < 3 || (args.length < 4 && helpFlag)) {
  displayHelp();
}

if (help && validCommand) {
  console.log();
  console.error(`  ${chalk.black.bgGreen('Command:')} ${chalk.cyan(programName)} ${chalk.magenta(command)}`);
}

program.parse(args);

if (!validCommand) {
  if (showInvalidMessage) {
    console.log();
    console.error(`  ${chalk.black.bgRed('Invalid command:')} ${chalk.cyan(programName)} ${chalk.magenta(command)}`);
  }
  displayHelp();
}

module.exports.displayHelp = displayHelp;
module.exports.program = program;
module.exports.programName = programName;
