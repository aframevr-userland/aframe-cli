#!/usr/bin/env node

const logger = require('loggy');

const publishTemplates = require('../lib/publish-all');

if (module.parent) {
  logger.error('`npm run publish-all` should be called from the command line');
  process.exit(1);
}

const argv = process.argv.slice(2);
let version = argv[0];

publishTemplates(version);
