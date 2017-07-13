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
const commandLineArgs = require('command-line-args');
const commandLineCommands = require('command-line-commands');
const commandLineUsage = require('command-line-usage');
const fs = require('fs-extra');
const install = require('deps-install');
const logger = require('loggy');

const commands = require('./commands/index.js');
const pkgJson = require('./package.json');
const utils = require('./lib/utils.js');

const getBrunchConfigPath = utils.getBrunchConfigPath;
const manifest = utils.manifestMerge;

const validCommands = [null, 'create', 'build', 'deploy', 'serve', 'submit', 'version', 'help', 'update'];
let parsedCommands = {};

try {
  parsedCommands = commandLineCommands(validCommands);
} catch (err) {
  if (err.name === 'INVALID_COMMAND') {
    displayHelp();
    process.exit(1);
  } else {
    throw err;
  }
}

// For backwards compatibility, convert `aframe new` commands from the old to new CLI format.
//
//   aframe new 360-tour           =>  aframe new --template 360-tour
//   aframe new 360-tour my-scene  =>  aframe new --template 360-tour my-scene
//
// NOTE: The new CLI usage is defined here: https://aframe.io/cli/
//       The new CLI rearchitecture is being properly addressed in PR #68:
//       https://github.com/aframevr-userland/aframe-cli/pull/68
if (process.argv[2] === 'new') {
  if (!process.argv.includes('--template')) {
    process.argv.splice(3, 0, '--template');
  }
}

if (process.argv[2] === 'publish' || process.argv[2] === 'push') {
  process.argv[2] = 'deploy';
}

const command = parsedCommands.command;
const argv = parsedCommands.argv;

function displayVersion () {
  console.log(pkgJson.version);
  process.exit();
}

function getHeaderLogo () {
  const concat = require('concat-stream');
  const pictureTube = require('picture-tube');

  return new Promise((resolve, reject) => {
    const imgPath = path.join(__dirname, 'assets', 'img', 'aframe-logo.png');
    const imgStream = fs.createReadStream(imgPath).pipe(pictureTube({cols: 46}));

    const concatStream = concat(imgBuffer => {
      resolve(imgBuffer.toString());
    });

    imgStream.on('error', reject);
    imgStream.pipe(concatStream);
  });
}

function displayHelp () {
  const binName = pkgJson.libraryName || pkgJson.productName || Object.keys(pkgJson.bin)[0];
  const binStr = `[bold]{[cyan]{${binName}}}`;

  let logoContent = '';

  return getHeaderLogo().then(content => {
    logoContent = content;
    displayUsage();
  }).catch(() => {
    displayUsage();
  });

  function displayUsage () {
    const sections = [
      {
        content: logoContent,
        raw: true,
      },
      {
        header: binName,
        content: `${binStr} is a command-line interface for building, managing, and publishing A-Frame scenes.`
      },
      {
        header: 'Usage',
        content: `$ ${binStr} [magenta]{<command>} [blue]{[options]}`
      },
      {
        header: 'Commands',
        content: [
          {name: 'create', summary: 'Create a new A-Frame scene.' },
          {name: 'serve', summary: 'Package an app for distribution.'},
          // {name: 'update', summary: `Update the ${binStr} CLI to its latest version.`},
          {name: 'version', summary: 'Output the version number.'},
          {name: 'help', summary: 'Output the usage information.'},
        ]
      },
      {
        header: 'Examples',
        content: [
          {
            desc: '1. Create a new A-Frame scene at a URL.',
            example: `$ ${binStr} [magenta]{create} default`,
          },
          {
            desc: '2. Create a new A-Frame "Model Viewer" scene at a path.',
            example: `$ ${binStr} [magenta]{create} model path/to/my/project/`,
          },
          // {
          //   desc: '3. Serve a local development server to preview an A-Frame scene in your browser.',
          //   example: `$ ${binStr} [magenta]{serve}`,
          // },
          // {
          //   desc: '4. Serve a local development server at a path.',
          //   example: `$ ${binStr} [magenta]{serve} path/to/my/project/`,
          // }
        ]
      },
      {
        content: `Project homepage: [underline]{${pkgJson.homepage}}`
      }
    ];

    const usage = commandLineUsage(sections);

    console.log(usage);
  }
}

function create () {
  const initSkeleton = require('init-skeleton').init;

  const templatesList = require('./templates/index.json').templates;

  const optionDefinitions = [
    {name: 'template', alias: 't', type: String, defaultOption: true, defaultValue: argv[0] || 'default'},
    {name: 'directory', alias: 'd', type: String, defaultValue: argv[1]},
  ];
  const templateNameDefault = 'aframe-default-template';

  const options = commandLineArgs(optionDefinitions, {argv});

  const template = options.template;
  let projectDir = options.directory;

  let templateName = templateNameDefault;

  if (template && typeof template === 'string') {
    // If template name is provided in Git format (e.g., `cvan/aframe-forest-template`).
    if (template.indexOf('/') === -1 && !template.startsWith('aframe-') && !template.endsWith('-template')) {
      templateName = `aframe-${template.toLowerCase()}-template`;
    } else {
      templateName = template;
    }
  }

  const templateSourceDir = path.join(__dirname, '..', 'templates', templateName);
  if (!projectDir) {
    projectDir = path.basename(templateName);
  }

  if (fs.existsSync(templateSourceDir)) {
    logger.log(`Copying local template "${templateName}" to "${projectDir}" …`);

    return fs.copy(templateSourceDir, projectDir, {
      errorOnExist: true,
      filter: filepath => !/^\.(git|hg|svn|node_modules)$/.test(path.basename(filepath))
    }).then(() => {
      return install({
        rootPath,
        pkgType: ['package', 'bower'],
        logger
      });
    });
  }

  logger.log(`Downloading remote template "${templateName}" to "${projectDir}" …`);

  return initSkeleton(templateName, {
    logger,
    projectDir,
    commandName: 'aframe create'
  });
}

function serve (argv) {
  // TODO: Implement!
  logger.error('Not Implemented');
  return Promise.reject(new Error('Not Implemented'));
  // return commands.serve(watchPath, options);
}

function deploy (argv) {
  // TODO: Implement!
  logger.error('Not Implemented');
  return Promise.reject(new Error('Not Implemented'));
  // return commands.serve(deployPath, options);
}

switch (command) {
  case 'create':
    create();
    break;
  case 'serve':
    serve();
    break;
  case 'deploy':
    deploy();
    break;
  case 'help':
    displayHelp();
    break;
  case 'update':
    updateRuntime();
    break;
  default:
    if (argv.includes('-v') ||
        argv.includes('--v') ||
        argv.includes('--version')) {
      displayVersion();
      break;
    }
    displayHelp();
    break;
}

// program
//   .command('deploy [path]')
//   .alias('d')
//   .description('Deploy (to a static CDN) an A-Frame project in path (default: current directory).')
//   .option('-p, --production', 'same as `--env production`')
//   .option('-c, --config [path]', 'specify a path to Brunch config file')
//   .option('-t, --timeout [timeout]', 'timeout (in milliseconds) for connecting to CDN (default: `5000`)', parseFloat, 5000)
//   .option('-d, --disconnect-timeout [timeout]', 'timeout (in milliseconds) for disconnecting to CDN (default: `10000`)', parseFloat, 10000)
//   .option('--no-open', 'do not automatically open browser window')
//   .option('--no-clipboard', 'do not automatically add deployed URL to clipboard')
//   .option('--no-submit', 'do not submit site to the A-Frame Index')
//   .action((filePath, options) => {
//     displayLogo();
//     setTimeout(() => {
//       process.stdout.write('\n');
//       commands.deploy(filePath, options);
//     }, 150);
//   });
//
// program
//   .command('submit [url]')
//   .alias('i')
//   .description('Submit site URL (of an A-Frame project) to the A-Frame Index.')
//   .option('-t, --timeout [timeout]', 'timeout (in milliseconds) for submitting to A-Frame Index API (default: `5000`)', parseFloat, 5000)
//   .option('--no-open', 'do not automatically open browser window')
//   .option('--no-clipboard', 'do not automatically add deployed URL to clipboard')
//   .option('--no-submit', 'do not submit site to the A-Frame Index')
//   .action((siteUrl, options) => {
//     displayLogo();
//     setTimeout(() => {
//       process.stdout.write('\n');
//       commands.submit(siteUrl, options);
//     }, 150);
//   });
//
// program
//   .command('serve [path] [options]')
//   .alias('s')
//   .description('Serve an A-Frame project in path (default: current directory).')
//   .option('-e, --env [setting]', 'specify a set of override settings to apply')
//   .option('-p, --production', 'same as `--env production`')
//   .option('-s, --server', 'run a simple HTTP server for the public directory on localhost')
//   .option('-n, --network', 'if `server` was given, allow access from the network')
//   .option('-P, --port [port]', 'if `server` was given, listen on this port')
//   .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
//   .option('-j, --jobs [num]', 'parallelize the build')
//   .option('-c, --config [path]', 'specify a path to Brunch config file')
//   .option('--stdin', 'listen to stdin and exit when stdin closes')
//   .option('--not-open', 'do not automatically open browser window', Boolean, true)
//   .option('--no-clipboard', 'do not automatically add served URL to clipboard')
//   .action(function (watchPath, options) {
//     if (arguments.length)
//     console.log('options', options);
//     console.log('arguments', arguments);
//
//     displayLogo();
//
//     setTimeout(() => {
//       process.stdout.write('\n');
//       commands.serve(watchPath, options);
//     }, 150);
//   });
//
// if (process.argv.length <= 3) {
//   process.argv.splice(2,
// }
//
// program
//   .command('build [path]')
//   .alias('b')
//   .description('Build an A-Frame project in path (default: current directory).')
//   .option('-e, --env [setting]', 'specify a set of override settings to apply')
//   .option('-p, --production', 'same as `--env production`')
//   .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
//   .option('-j, --jobs [num]', 'parallelize the build')
//   .option('-c, --config [path]', 'specify a path to Brunch config file')
//   .action((filePath, options) => commands.build(filePath, options));
//
// program
//   .command('new [path]')
//   .alias('n')
//   .description('Create a new A-Frame project in path.')
//   .option('-t, --template [name]', 'template name or URL from https://aframe.io/templates')
//   .on('--help', () => {
//     require('./lib/init-template.js').printBanner('aframe new --template');
//   })
//   .action(commands.new);
//
// let args = process.argv.slice();
// const programName = args[1] = 'aframe';
// const helpFlag = args.includes('--help') || args.includes('-h');
// const helpCommand = args.includes('help') || args.includes('h');
// const help = helpFlag || helpCommand;
// const versionFlag = args.includes('--version') || args.includes('-v');
// const versionCommand = args.includes('version') || args.includes('v');
// const version = versionFlag || versionCommand;
// let showInvalidMessage = args.length > 2 && !help && !version;
//
// const command = args[2];
//
// const validCommand = program.commands.some(cmd => {
//   return cmd.name() === command || cmd.alias() === command;
// });
//
// showInvalidMessage = !validCommand && !help && !version;
//
// function init () {
//   // User ran command `aframe`.
//   if (args.length < 3) {
//     displayLogo();
//     process.on('exit', () => {
//       process.stdout.write('\n');
//       if (args.length < 3) {
//         displayHelp();
//       }
//     });
//
//     setTimeout(() => {
//       if (args.length < 3) {
//         process.exit();
//       }
//     }, 150);
//     return;
//   }
//
//   // User ran command `aframe <command> --help`.
//   if (args.length < 4 && helpFlag) {
//     displayHelp();
//     process.exit(0);
//   }
//
//   if (help && validCommand) {
//     console.log();
//     console.error(`  ${chalk.black.bgGreen('Command:')} ${chalk.bold.cyan(programName)} ${chalk.magenta(command)}`);
//   }
//
//   program.parse(args);
//
//   if (!validCommand) {
//     if (showInvalidMessage) {
//       console.log();
//       console.error(`  ${chalk.black.bgRed('Invalid command:')} ${chalk.cyan(programName)} ${chalk.magenta(command)}`);
//     }
//     displayHelp();
//     process.exit(1);
//   }
// }
//
// init();
//
// module.exports.init = init;
// module.exports.displayHelp = displayHelp;
// module.exports.displayLogo = displayLogo;
// module.exports.program = program;
// module.exports.programName = programName;
