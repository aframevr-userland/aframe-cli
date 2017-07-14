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
const mergeManifest = utils.mergeManifest;
const templatesByAlias = utils.templatesByAlias;

const validCommands = [null, 'create', 'build', 'deploy', 'serve', 'submit', 'version', 'help', 'update'];

switch (process.argv[2]) {
  case 'new':
    // For backwards compatibility, convert `aframe new` commands from the old to new CLI format.
    //
    //   aframe new 360-tour           =>  aframe new --template 360-tour
    //   aframe new 360-tour my-scene  =>  aframe new --template 360-tour my-scene
    //
    // NOTE: The new CLI usage is defined here: https://aframe.io/cli/
    //       The new CLI rearchitecture is being properly addressed in PR #68:
    //       https://github.com/aframevr-userland/aframe-cli/pull/68
    if (!process.argv.includes('--template')) {
      process.argv.splice(3, 0, '--template');
    }
  case 'start':
    process.argv[2] = 'create';
    break;
  case 'compile':
  case 'generate':
    process.argv[2] = 'build';
    break;
  case 'publish':
  case 'push':
    process.argv[2] = 'deploy';
    break;
}

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
    links.push({name: 'Project homepage', summary: link(pkgJson.homepage)});
  }

  links.push({name: 'A-Frame examples', summary: link('https://aframe.io/examples/')});

  if (typeof pkgJson.bugs === 'string') {
    pkgJson.bugs = {url: pkgJson.bugs};
  }

  if (pkgJson.bugs && pkgJson.bugs.url) {
    links.push({name: 'File an issue', summary: link(pkgJson.bugs.url)});
  }

  return getHeaderLogo().then(content => {
    logoContent = content;
    displayUsage();
  }).catch(() => {
    displayUsage();
  });

  function link (url) {
    return `[underline]{${url}}`;
  }

  function bullet (str) {
    return `${++bulletCounter}. ${str}`;
  }

  function cmd (cmdName) {
    return `[magenta]{${cmdName}}`;
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
          {name: cmd('create'), summary: 'Create a new A-Frame scene.'},
          {name: cmd('build'), summary: 'Build an A-Frame scene.'},
          {name: cmd('serve'), summary: 'Serve a local-development server for an A-Frame project.'},
          // {name: cmd('update'), summary: `Update the ${binStr} CLI to its latest version.`},
          {name: cmd('version'), summary: 'Output the version number.'},
          {name: cmd('help'), summary: 'Output the usage information.'},
        ]
      },
      {
        header: 'Examples',
        content: [
          {
            desc: bullet('Create a new A-Frame scene.'),
            example: `$ ${binStr} ${cmd('create')}`,
          },
          {
            desc: bullet('Create a new empty scene.'),
            example: `$ ${binStr} ${cmd('create')} default`,
          },
          {
            desc: bullet('Create a "Model Viewer" scene at a path.'),
            example: `$ ${binStr} ${cmd('create')} model path/to/my/project/`,
          },
          {
            desc: bullet('Create a scene based on a template on GitHub.'),
            example: `$ ${binStr} ${cmd('create')} cvan/aframe-polar-template`,
          },
          {
            desc: bullet('Serve a local-development server to view an A-Frame scene in your browser.'),
            example: `$ ${binStr} ${cmd('serve')}`,
          },
          {
            desc: bullet('Serve a local-development server at a path.'),
            example: `$ ${binStr} ${cmd('serve')} path/to/my/project/`,
          }
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
  template = template || getTemplateByAliasOrUrl('default');
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

function build () {
  const brunchBuild = require('brunch').build;

  const projectDir = argv[0] || process.cwd();

  const optionDefinitions = [
    {name: 'directory', alias: 'd', type: String, defaultOption: true, defaultValue: argv[0] || process.cwd()},
    {name: 'config', alias: 'c', type: String, defaultValue: getBrunchConfigPath(projectDir)}
  ];

  const options = commandLineArgs(optionDefinitions, {argv});

  return new Promise((resolve, reject) => {
    logger.log(`Building project "${projectDir}" …`);

    try {
      brunchBuild(options, resolve);
    } catch (err) {
      logger.error(`Could not build project "${projectDir}" …`);
      throw err;
    }
  }).then(() => {
    let builtPath = null;
    try {
      builtPath = path.resolve(projectDir, require(options.config).paths.public);
    } catch (err) {
    }
    if (builtPath) {
      logger.log(`Built project "${projectDir}" to "${builtPath}"`);
      return Promise.resolve(builtPath);
    } else {
      logger.log(`Built project "${projectDir}"`);
    }
  });
}

function serve () {
  const url = require('url');

  const brunchWatch = require('brunch').watch;
  const clipboardy = require('clipboardy');
  const formidable = require('formidable');
  const opn = require('opn');

  const optionDefinitions = [
    {name: 'directory', alias: 'd', type: String, defaultOption: true, defaultValue: argv[0] || process.cwd()},
    {name: 'config', alias: 'c', type: String, defaultValue: getBrunchConfigPath(argv[0] || process.cwd())},
    {name: 'jobs', alias: 'j', type: Boolean, defaultValue: true},
    {name: 'no-clipboard', alias: 'l', type: Boolean, defaultValue: false},
    {name: 'no-open', alias: 'o', type: Boolean, defaultValue: false}
  ];

  const options = commandLineArgs(optionDefinitions, {argv});
  options.server = true;
  options.network = true;

  const projectDir = options.directory;
  console.log(options.config);

  return new Promise((resolve, reject) => {
    const optionsFile = require(options.config);

    logger.log(`Watching "${projectDir}" …`);

    // Copy the server URL to the user's clipboard.
    const port = (optionsFile.server && optionsFile.server.port) || 3333;
    const https = options.https || options.ssl || options.secure || false;
    const serverUrl = `http${https ? 's' : ''}://localhost:${port}/`;
    try {
      const watcher = brunchWatch(true, options.directory, options, () => {
        // Saves preview videos from recorder component.
        watcher.server.on('request', function (req, res) {
          const method = req.method.toLowerCase();
          const pathname = url.parse(req.url).pathname;

          if (method === 'post' && pathname === '/upload') {
            let form = new formidable.IncomingForm();
            let files = [];

            form.encoding = 'binary';
            form.keepExtensions = true;
            form.multiple = true;

            const uploadDir = path.join(projectDir, 'app', 'assets', 'video');

            fs.ensureDir(uploadDir);

            form.on('fileBegin', function(name, file) {
              file.path = path.join(uploadDir, file.name);
            });

            form.on('file', (field, file) => {
              files.push([field, file]);

              const data = {
                'aframe': {
                  'videos': [
                    {
                      'src': `assets/video/${file.name}`,
                      'type': file.type
                    }
                  ]
                }
              };

              mergeManifest(projectDir + '/package.json', data);
            });

            form.on('error', formErr => {
              console.error(formErr);
            });

            form.on('end', () => {
              res.end();
            });

            form.parse(req);
          }
        });

        logger.log(`Local server running: ${serverUrl}`);

        if (!options.noClipboard) {
          clipboardy.writeSync(serverUrl);
        }

        if (!options.noOpen) {
          opn(serverUrl, {wait: false});
        }

        resolve(serverUrl);
      });
    } catch (err) {
      logger.error(`Could not watch project "${projectDir}" …`);
      reject(err);
    }
  });
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
  case 'build':
    build();
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
