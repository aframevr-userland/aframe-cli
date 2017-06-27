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
const displayLogo = () => {
  const pictureTube = require('picture-tube');
  return fs.createReadStream(path.join(__dirname, 'assets', 'img', 'aframe-logo.png'))
    .pipe(pictureTube({cols: 46}))
    .pipe(process.stdout);
};

program
  .version(pkg.version, '-v, --version', 'output the version number')
  .usage('[command] [options]');

if (process.argv[2] === 'publish' || process.argv[2] === 'push') {
  process.argv[2] = 'deploy';
}

program
  .command('deploy [path]')
  .alias('d')
  .description('Deploy (to a static CDN) an A-Frame project in path (default: current directory).')
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .option('-t, --timeout [timeout]', 'timeout (in milliseconds) for connecting to CDN (default: `5000`)', parseFloat, 5000)
  .option('-d, --disconnect-timeout [timeout]', 'timeout (in milliseconds) for disconnecting to CDN (default: `10000`)', parseFloat, 10000)
  .option('--no-open', 'do not automatically open browser window')
  .option('--no-clipboard', 'do not automatically add deployed URL to clipboard')
  .option('--no-submit', 'do not submit site to the A-Frame Index')
  .action((filePath, options) => {
    displayLogo();
    setTimeout(() => {
      process.stdout.write('\n');
      commands.deploy(filePath, options);
    }, 150);
  });

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
  .option('--no-open', 'do not automatically open browser window')
  .option('--no-clipboard', 'do not automatically add served URL to clipboard')
  .action((watchPath, options) => {
    displayLogo();
    setTimeout(() => {
      process.stdout.write('\n');
      commands.serve(watchPath, options);
    }, 150);
  });

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
const versionFlag = args.includes('--version') || args.includes('-v');
const versionCommand = args.includes('version') || args.includes('v');
const version = versionFlag || versionCommand;
let showInvalidMessage = args.length > 2 && !help && !version;

const command = args[2];

const validCommand = program.commands.some(cmd => {
  return cmd.name() === command || cmd.alias() === command;
});

showInvalidMessage = !validCommand && !help && !version;

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
    displayLogo();
    process.on('exit', () => {
      process.stdout.write('\n');
      if (args.length < 3) {
        displayHelp();
      }
    });

    setTimeout(() => {
      if (args.length < 3) {
        process.exit();
      }
    }, 150);
    return;
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
module.exports.displayLogo = displayLogo;
module.exports.program = program;
module.exports.programName = programName;
