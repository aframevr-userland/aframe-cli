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
const urlParse = require('url').parse;

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

const createGitignore = utils.createGitignore;
const createOrReadPackage = utils.createOrReadPackage;
const getArgvPaths = utils.getArgvPaths;
const getBrunchConfigPath = utils.getBrunchConfigPath;
const getTemplateByAliasOrUrl = utils.getTemplateByAliasOrUrl;
const mergePackage = utils.mergePackage;
const pkgDefault = utils.pkgDefault;
const readPackage = utils.readPackage;
const rewritePackage = utils.rewritePackage;
const templatesByAlias = utils.templatesByAlias;

const validCommands = [null, 'create', 'build', 'serve', 'deploy', 'submit', 'version', 'help', 'update'];

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
  case 'server':
  case 'dev':
    process.argv[2] = 'serve';
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
    help();
    process.exit(1);
  } else {
    throw err;
  }
}

const command = parsedCommands.command;
const argv = parsedCommands.argv;

function version () {
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

function help () {
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
        content: `${binStr} is a command-line tool for building, managing, and publishing A-Frame scenes.`
      },
      {
        header: 'Usage',
        content: `$ ${binStr} ${cmd('<command>')} [blue]{[options]}`
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
        }).then(postinstall);
      });
    });
  }

  logger.log(`Downloading remote template "${templatePath}" to "${projectDir}" …`);

  return initSkeleton(templatePath, {
    logger: logger,
    rootPath: projectDir,
    commandName: 'aframe create'
  }).then(postinstall);

  function postinstall () {
    logger.log(`Rewriting "package.json" file in "${projectDir}" …`);
    return Promise.all([
      rewritePackage(projectDir, {
        force: argv.includes('--force') || argv.includes('-f')
      }),
      createGitignore(projectDir, {
        force: argv.includes('--force') || argv.includes('-f')
      })
    ]);
  }
}

function build (projectDir) {
  projectDir = projectDir || getArgvPaths(argv)[0] || process.cwd();

  process.chdir(projectDir);

  return readPackage(projectDir).then(pkg => {
    if (!pkg.scripts.build.toLowerCase().trim().endsWith(pkgDefault.scripts.build)) {
      const spawn = require('child_process').spawn;

      logger.log(`Building project using custom "build" npm script …`);

      const child = spawn('npm', ['run', 'build'], {nodejs: true});
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', logger.info);
      child.stdout.on('error', logger.error);

      return Promise.resolve(pkg.scripts.build);
    }

    return next();
  }).catch(() => {
    return next();
  });

  function next () {
    return Promise.resolve(false);
    // const brunchBuild = require('brunch').build;
    //
    // const optionDefinitions = [
    //   {name: 'directory', alias: 'd', type: String, defaultOption: true, defaultValue: projectDir},
    //   {name: 'config', alias: 'c', type: String, defaultValue: getBrunchConfigPath(projectDir)}
    // ];
    //
    // const options = commandLineArgs(optionDefinitions, {argv});
    //
    // return new Promise((resolve, reject) => {
    //   logger.log(`Building project "${projectDir}" …`);
    //
    //   try {
    //     brunchBuild(options, resolve);
    //   } catch (err) {
    //     logger.error(`Could not build project "${projectDir}" …`);
    //     throw err;
    //   }
    // }).then(() => {
    //   let builtPath = null;
    //   try {
    //     builtPath = path.resolve(projectDir, require(options.config).paths.public);
    //   } catch (err) {
    //   }
    //   if (builtPath) {
    //     logger.log(`Built project "${projectDir}" to "${builtPath}"`);
    //     return Promise.resolve(builtPath);
    //   } else {
    //     logger.log(`Built project "${projectDir}"`);
    //   }
    // });
  }
}

function serve (projectDir) {
  projectDir = projectDir || getArgvPaths(argv)[0] || process.cwd();

  process.chdir(projectDir);

  let clipboarded = false;
  let opened = false;

  return createOrReadPackage(projectDir).then(pkg => {
    if (pkg.scripts.serve.toLowerCase().trim().indexOf(pkgDefault.scripts.serve) === -1) {
      const spawn = require('child_process').spawn;

      logger.log(`Serving project using custom "serve" npm script …`);

      const child = spawn('npm', ['run', 'serve'], {nodejs: true});
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', logger.info);
      child.stdout.on('error', logger.error);

      return Promise.resolve(pkg.scripts.serve);
    }

    return serveNext();
  }).catch(() => {
    return serveNext();
  });

  function serveNext () {
    const url = require('url');

    const liveServer = require('live-server');
    const clipboardy = require('clipboardy');
    const formidable = require('formidable');
    const opn = require('opn');

    const optionDefinitions = [
      {name: 'directory', alias: 'd', type: String, defaultOption: true, defaultValue: projectDir},
      // {name: 'config', alias: 'c', type: String, defaultValue: getBrunchConfigPath(projectDir)},
      {name: 'ignore', alias: 'i', type: Array, defaultValue: []},
      {name: 'https', alias: 's', type: String, defaultValue: null},
      {name: 'host', alias: 'H', type: String, defaultValue: null},
      {name: 'port', alias: 'P', type: Number, defaultValue: 3333},
      {name: 'reload', alias: 'r', type: Number, defaultValue: 0},  // Reload after a delayed amount of time, in milliseconds (default: `0`).
      {name: 'open', alias: 'o', type: String},
      {name: 'clipboard', alias: 'l', type: String, defaultValue: null},
      // {name: 'debug', alias: 'e', type: String},
      // {name: 'env', alias: 'n', type: String},
      // {name: 'production', alias: 'p', type: Boolean, defaultValue: false},
    ];

    const options = commandLineArgs(optionDefinitions, {argv});

    projectDir = options.directory = path.resolve(options.directory);
    process.chdir(projectDir);

    // const optionsFile = require(options.config);

    options.https = (process.env.HTTPS || process.env.SSL || options.https || options.ssl) === 'false' ? false : true;
    // options.host = process.env.HOST || process.env.IP || (optionsFile.server && optionsFile.server.host) || '0.0.0.0';
    options.host = process.env.HOST || process.env.IP || options.host || '0.0.0.0';
    // options.port = process.env.PORT || (optionsFile.server && optionsFile.server.port) || 3333;
    options.port = process.env.PORT || options.port || 3333;

    options.open = !('open' in options) || options.open === 'false' ? false : true;
    options.clipboard = options.clipboard === 'false' ? false : true;

    options.server = true;
    options.network = true;
    options.persistent = true;

    logger.log(`Watching "${projectDir}" …`);

    const serverHost = !options.host || options.host === '0.0.0.0' ? 'localhost' : options.host;
    const serverPort = options.port;
    const serverUrl = `http${options.https ? 's' : ''}://${serverHost}:${serverPort}/`;

    // console.log(options.directory);

    const liveServerParams = {
      root: options.directory,
      port: options.port,
      host: options.host,
      open: options.open,
      ignore: options.ignore,
      // file: "index.html",  // When set, serve this file for every 404 (useful for SPAs).
      wait: options.reload,
      mount: [  // Mount a directory to a route.
        [
          '/components',
          './node_modules'
        ]
      ],
      logLevel: 2,  // 0 = errors only; 1 = some; 2 = lots
      middleware: [
        function (req, res, next) {

          // var path = urlParse(req.url).pathname;
          // if (path.indexOf('/' + consts.DIST) !== -1) {
          //   req.url = req.url.replace('/dist/', '/build/');
          // }

          console.log(req.url);

          // console.log(res);

          next();
        }
      ]  // Takes an array of `connect`-compatible middleware that are injected into the server's middleware stack.
    };
    liveServer.start(liveServerParams);

    logger.log(`Local server running: ${serverUrl}`);

    // Copy the server URL to the user's clipboard.
    if (!clipboarded && options.clipboard) {
      clipboardy.writeSync(serverUrl);
    }

    if (!opened && options.open) {
      opened = true;
      opn(serverUrl, {wait: false});
    }

    return serverUrl;

    /*
    return new Promise((resolve, reject) => {
      try {
        const watcher = brunchWatch(options, () => {
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

              form.on('fileBegin', (name, file) => {
                file.path = path.join(uploadDir, file.name);
              });

              form.on('file', (field, file) => {
                files.push([field, file]);

                mergePackage(path.join(projectDir, 'package.json'), {
                  aframe: {
                    videos: [
                      {
                        src: `assets/video/${file.name}`,
                        type: file.type
                      }
                    ]
                  }
                });
              });

              form.on('error', formErr => {
                logger.error(formErr);
              });

              form.on('end', () => {
                res.end();
              });

              form.parse(req);
            }
          });
        });
      } catch (err) {
        logger.error(`Could not watch project "${projectDir}" …`);
        reject(err);
      }
    });
    */
  }
}

function deploy (projectDir) {
  projectDir = projectDir || getArgvPaths(argv)[0] || process.cwd();

  const optionDefinitions = [
    {name: 'directory', alias: 'd', type: String, defaultOption: true, defaultValue: projectDir},
    {name: 'config', alias: 'c', type: String, defaultValue: getBrunchConfigPath(projectDir)},
    {name: 'open', alias: 'o', type: String},
    {name: 'clipboard', alias: 'l', type: String, defaultValue: null},
    {name: 'submit', alias: 's', type: String, defaultValue: null}
  ];

  const options = commandLineArgs(optionDefinitions, {argv});
  options.directory = path.resolve(options.directory);
  options.open = !('open' in options) || options.open === 'false' ? false : true;
  options.clipboard = options.clipboard === 'false' ? false : true;
  options.submit = options.submit === 'false' ? false : true;

  projectDir = options.directory;
  process.chdir(projectDir);

  return readPackage(projectDir).then(pkg => {
    if (!pkg.scripts.deploy.toLowerCase().trim().endsWith(pkgDefault.scripts.deploy)) {
      const spawn = require('child_process').spawn;

      logger.log(`Deploying project using custom "deploy" npm script …`);

      const child = spawn('npm', ['run', 'deploy'], {nodejs: true});
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', logger.info);
      child.stdout.on('error', logger.error);

      return Promise.resolve(pkg.scripts.deploy);
    }

    return next();
  }).catch(() => {
    return next();
  });

  function next () {
    const brunch = require('brunch');
    const clipboardy = require('clipboardy');
    const glob = require('glob');
    const opn = require('opn');

    const submitToIndex = require('./lib/submit.js').submit;

    return new Promise((resolve, reject) => {
      let deployPath = null;
      try {
        deployPath = path.resolve(projectDir, require(options.config).paths.public);
      } catch (err) {
      }

      deployPath = deployPath || projectDir;
      process.chdir(projectDir);

      options = options || {};
      options.config = options.config || getBrunchConfigPath(deployPath, options);

      logger.log(`Deploying project "${deployPath}" …`);

      return build(deployPath, options).then(builtPath => {
        if (builtPath) {
          deployPath = builtPath;
          buildDone(builtPath);
        }
      }).catch(() => {
        buildDone();
      });

      function buildDone (builtPath) {
        return fs.readJson(path.join(builtPath ? builtPath : deployPath, 'package.json')).then(pkgObj => {
          return pkgObj;
        }, err => {
          return fs.readJson(path.join(deployPath, 'package.json')).then(pkgObj => {
            return pkgObj;
          }, () => {
            return {};
          });
        }).then(pkgObj => {
          pkgObj = pkgObj || {};
          let rootDir = path.basename(deployPath);
          if (deployPath === builtPath) {
            rootDir = path.basename(path.resolve(builtPath, '..'));
          }
          return deployToIPFS(options, deployPath, rootDir, pkgObj).then(deployedUrl => {
            if (!deployedUrl) {
              throw new Error(`Unknown error occurred upon deploying project "${deployPath}"`);
            }
            return deployedUrl;
          }, err => {
            throw err;
          });
        }).catch(err => {
          if (err) {
            logger.error(`Could not deploy project "${deployPath}":`, err);
          } else {
            logger.error(`Could not deploy project "${deployPath}"`);
          }
          throw err;
          process.exit(1);
        });
      }
    });

    const deployToIPFS = (options, deployPath, rootDir, pkgObj) => {
      const IPFS = require('ipfs-daemon');

      const ipfsAddFiles = ipfsNode => {
        // The IPFS daemon is running, and the IPFS node is now ready to use.
        return new Promise((resolve, reject) => {
          glob('**/*', {
            cwd: deployPath,
            dot: true,
            nodir: true,
            ignore: [
              '.git/**',
              'node_modules/**',
              'ipfs/**'
            ]
          }, (err, files) => {
            if (err || !files) {
              reject(new Error('Could not find public files to deploy'));
              return;
            }
            resolve(files);
          });
        }).then(files => {
          const crypto = require('crypto');
          let hash = crypto.createHash('sha256');
          let strToHash = '';

          let filesToAddPromises = files.map(filename => {
            return new Promise((resolve, reject) => {
              let file = {
                _realPath: path.join(deployPath, filename),
                path: `${rootDir}/${filename}`,
                content: fs.createReadStream(path.join(deployPath, filename))
              };
              file.content.on('data', data => {
                strToHash += file.path + ';' + data.toString();
              });
              file.content.on('end', () => {
                resolve(file);
              });
              file.content.on('error', reject);
            });
          });

          return Promise.all(filesToAddPromises).then(filesToAdd => {
            hash.update(strToHash);

            const rootDirHash = hash.digest('hex');

            filesToAdd.map(file => {
              file.path = `${rootDirHash}/${file.path}`;
              file.content = fs.createReadStream(file._realPath);
              delete file._realPath;
              return file;
            });

            return ipfsNode.files.add(filesToAdd);
          });
        }).then(filesAdded => {
          const dirMultihash = filesAdded[filesAdded.length - 1].hash;
          const numFiles = filesAdded.length - 1;
          logger.info(`Successfully published directory "${deployPath}" (file${numFiles === 1 ? '' : 's'}) to IPFS: ${dirMultihash}`);
          const deployedUrl = `https://ipfs.io/ipfs/${dirMultihash}/${rootDir}/`;
          return deployedUrl;
        }, err => {
          logger.error('Error adding to IPFS:', err);
        });
      };

      let ipfsNode = null;
      return new Promise((resolve, reject) => {
        let ipfsNodeReady = false;
        logger.info('Starting IPFS node');
        ipfsNode = new IPFS();
        ipfsNode.on('ready', () => {
          logger.info('IPFS node is ready');
          ipfsNodeReady = true;
          resolve(ipfsAddFiles(ipfsNode));
        });
        ipfsNode.on('error', err => {
          ipfsNodeReady = true;
          reject(new Error('Error occurred with IPFS node: ' + err));
        });
        setTimeout(() => {
          if (!ipfsNodeReady) {
            reject(new Error(`Could not connect to IPFS node (timed out after ${options.timeout / 1000} seconds)`));
          }
        }, options.timeout);
      }).then(deployedUrl => new Promise((resolve, reject) => {
        if (deployedUrl) {
          logger.log(`Deployed project to ${deployedUrl}`);
          // Copy to the user's clipboard the URL of the deployed project.
          if (options.clipboard) {
            clipboardy.writeSync(deployedUrl);
          }
          if (options.open) {
            opn(deployedUrl, {wait: false});
          }
          if (options.submit) {
            submitToIndex(deployedUrl);
          }
        }

        if (options.disconnectTimeout) {
          logger.info(`Keeping IPFS node open (for ${options.disconnectTimeout / 1000} seconds)`);
        }

        let ipfsNodeStopped = false;

        setTimeout(() => {
          logger.info('Stopping IPFS node');

          ipfsNode.stop();
          ipfsNode = null;

          logger.info('IPFS node stopped');

          resolve(deployedUrl);

          setTimeout(() => {
            if (ipfsNode) {
              reject(new Error(`Could not stop IPFS node (timed out after ${options.timeout / 1000} seconds)`));
            }
          }, options.timeout);

          if (!ipfsNode) {
            process.exit();
          }
        }, options.disconnectTimeout);
      }));
    };
  };
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
    help();
    break;
  // case 'update':
  //   updateRuntime();
  //   break;
  default:
    if (argv.includes('-v') ||
        argv.includes('--v') ||
        argv.includes('--version')) {
      version();
      break;
    }
    help();
    break;
}
