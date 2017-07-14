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
const getTemplateByAliasOrUrl = utils.getTemplateByAliasOrUrl;
const manifest = utils.manifestMerge;
const templatesByAlias = utils.templatesByAlias;

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
  let bulletCounter = 0;

  let links = [];

  if (pkgJson.homepage) {
    links.push({name: 'Project homepage', summary: `[underline]{${pkgJson.homepage}}`});
  }

  links.push({name: 'A-Frame examples', summary: `[underline]{https://aframe.io/examples/}`});

  if (typeof pkgJson.bugs === 'string') {
    pkgJson.bugs = {url: pkgJson.bugs};
  }

  if (pkgJson.bugs && pkgJson.bugs.url) {
    links.push({name: 'File an issue', summary: `[underline]{${pkgJson.bugs.url}}`});
  }

  return getHeaderLogo().then(content => {
    logoContent = content;
    displayUsage();
  }).catch(() => {
    displayUsage();
  });

  function bullet (str) {
    return `${++bulletCounter}. ${str}`;
  }

  function displayUsage () {
    const sections = [
      {
        content: logoContent,
        raw: true
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
            desc: bullet('Create a new A-Frame scene.'),
            example: `$ ${binStr} [magenta]{create}`,
          },
          {
            desc: bullet('Create a new empty scene.'),
            example: `$ ${binStr} [magenta]{create} default`,
          },
          {
            desc: bullet('Create a "Model Viewer" scene at a path.'),
            example: `$ ${binStr} [magenta]{create} model path/to/my/project/`,
          },
          {
            desc: bullet('Create a scene based on a template on GitHub.'),
            example: `$ ${binStr} [magenta]{create} cvan/aframe-polar-template`,
          },
          // {
          //   desc: bullet('Serve a local development server to preview an A-Frame scene in your browser.'),
          //   example: `$ ${binStr} [magenta]{serve}`,
          // },
          // {
          //   desc: bullet('Serve a local development server at a path.'),
          //   example: `$ ${binStr} [magenta]{serve} path/to/my/project/`,
          // }
        ]
      },
      {
        header: 'Links',
        content: links
      }
    ];

    const usage = commandLineUsage(sections);

    console.log(usage);
  }
}

function create () {
  const initSkeleton = require('init-skeleton').init;

  const optionDefinitions = [
    {name: 'template', alias: 't', type: String, defaultOption: true, defaultValue: argv[0]},
    {name: 'directory', alias: 'd', type: String, defaultOption: false, defaultValue: argv[1]},
  ];

  const templateNameDefault = 'aframe-default-template';

  if (argv.length === 1) {
    // Usage: `aframe new path/to/my/project/`.
    let alias = (argv[0] || '').trim().toLowerCase().replace(/^aframe-/i, '').replace(/-template$/i, '');
    if (!(alias in templatesByAlias) && !argv[0].includes('/aframe-') && !argv[0].endsWith('-template')) {
      // It's not a local template (e.g., `model`), nor is it a remotely hosted Git template (e.g., `cvan/aframe-polar-template`).
      optionDefinitions[0].defaultOption = false;
      optionDefinitions[0].defaultValue = templateNameDefault;

      optionDefinitions[1].defaultOption = true;
      optionDefinitions[1].defaultValue = argv[0];
    }
  }

  const options = commandLineArgs(optionDefinitions, {argv});

  let template;
  let templatePath;
  if (options.template) {
    template = getTemplateByAliasOrUrl(options.template.trim().toLowerCase().replace(/^aframe-/i, '').replace(/-template$/i, ''));
    if (template) {
      templatePath = template.url;
    }
  }
  templatePath = templatePath || templateNameDefault;

  const templateSourceDir = path.join(__dirname, 'templates', templatePath);

  let projectDir = options.directory || path.basename(templatePath);

  if (fs.existsSync(templateSourceDir)) {
    logger.log(`Copying local template "${template.alias}" to "${projectDir}" …`);

    return fs.ensureDir(projectDir).then(() => {
      return fs.copy(templateSourceDir, projectDir, {
        errorOnExist: true,
        filter: filepath => !/^node_modules|bower_components|\.(git|hg|svn)$/i.test(path.basename(filepath))
      }).then(() => {
        return install({
          logger: logger,
          rootPath: projectDir,
          pkgType: ['package', 'bower'],
        });
      });
    });
  }

  logger.log(`Downloading remote template "${templatePath}" to "${projectDir}" …`);

  return initSkeleton(templatePath, {
    logger: logger,
    rootPath: projectDir,
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
