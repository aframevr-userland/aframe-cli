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

const displayHelp = () => program.outputHelp(colorizeHelp);

program
  .version(pkg.version, '-v, --version', 'output the version number')
  .usage('[command] [options]');

program
  .command('deploy [path]')
  .alias('d')
  .description('Deploy (to a static CDN) an A-Frame project in path (default: current directory).')
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .option('-t, --timeout [timeout]', 'timeout (in milliseconds) for connecting/disconnecting to CDN (default: `3000`)', parseFloat, 3000)
  .action((filePath, options) => commands.deploy(filePath, options));

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
    .replace('Usage:  ', `${programName} `)
    .replace(new RegExp(`${programName} `, 'g'), `${chalk.bold.cyan(programName)} `)
    .replace(/\[command\] /g, `${chalk.magenta('[command]')} `);
};

function init () {
  // User ran command `aframe`.
  if (args.length < 3) {
    if (!helpFlag) {

      const pictureTube = require('picture-tube');
      fs.createReadStream(
        path.join(__dirname, 'assets', 'img', 'aframe-logo.png')
      )
        .pipe(pictureTube({cols: 46}))
        .pipe(process.stdout);

      process.on('exit', function () {
        process.stdout.write('\n');
        displayHelp();
      });

      return;
    }

    displayHelp();
    process.exit();
  }

  // User ran command `aframe <command> --help`.
  if (args.length < 4 && helpFlag) {
    displayHelp();
    process.exit(0);
  }

  if (help && validCommand) {
    console.log();
    console.error(`  ${chalk.black.bgGreen('Command:')} ${chalk.bold.cyan(programName)} ${chalk.magenta(command)}`);
  }

  program.parse(args);

  if (!validCommand) {
    if (showInvalidMessage) {
      console.log();
      console.error(`  ${chalk.black.bgRed('Invalid command:')} ${chalk.cyan(programName)} ${chalk.magenta(command)}`);
    }
    displayHelp();
    process.exit(1);
  }
}

init();

module.exports.init = init;
module.exports.displayHelp = displayHelp;
module.exports.program = program;
module.exports.programName = programName;
