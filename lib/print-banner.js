const chalk = require('chalk');

let templates = {};
templates.all = require('../templates/index.json').templates;
templates.withAliases = templates.all.filter(template => template && 'alias' in template);
templates.urlFor = alias => {
  for (const template of withAliases) {
    if (template.alias === alias) {
      return template.url;
    }
  }
};
const suggestedCount = 8;
const othersCount = templates.all.length - suggestedCount;

const printBanner = commandName => {
  if (!commandName) {
    commandName = 'aframe new';
  }

  const commandNameChunks = commandName.trim().split(' ');

  let commandStr = chalk.cyan(commandNameChunks[0]);
  if (commandNameChunks[1]) {
    commandStr += ` ${chalk.magenta(commandNameChunks[1])}`;
  }

  const suggestions = templates.withAliases
    .slice(0, suggestedCount)
    .map(template => {
      let line = `  - ${commandStr} ${chalk.green.bold('<project-directory>')} --template ${chalk.underline(template.alias || template.url)}`;

      template.technologies = template.technologies || '';
      if (Array.isArray(template.technologies)) {
        template.technologies = template.technologies.replace(/\s+/g, ' ').join(', ');
      }
      // Strip trailing punctuation (i.e., a period).
      template.technologies = template.technologies.replace(/\.\s*/, '');

      if (template.description) {
        line += chalk.bold.white(`\n    ${template.description}`);
      }
      if (template.technologies) {
        line += chalk.dim(` (Supports ${template.technologies}.)`);
      }
      return line + '\n';
    })
    .join('\n').trim();

  const error = new Error(`
Please specify the project directory:

  ${commandStr} ${chalk.green.bold('<project-directory>')}

For example:

  ${commandStr} ${chalk.green('my-project-directory')}

You should specify the template (boilerplate) from which your new
A-Frame scene will be initialized. Pass a template name or URL like so:

  ${commandStr} ${chalk.green('my-project-directory')} --template ${chalk.underline('default')}
  ${commandStr} ${chalk.green('my-project-directory')} --template ${chalk.underline('aframe-default-template')}
  ${commandStr} ${chalk.green('my-project-directory')} --template ${chalk.underline('https://github.com/aframevr-userland/aframe-default-template')}
  ${commandStr} ${chalk.green('my-project-directory')} --template ${chalk.underline('aframevr-userland/aframe-default-template')}

Here are a few popular A-Frame scene templates:

  ${suggestions}

View other${othersCount > 0 ? ` ${othersCount}` : ''} templates here:

  ${chalk.bold.underline('https://aframe.io/templates')}

Run ${chalk.cyan('aframe')} ${chalk.magenta('--help')} to see all options.
`);

  error.code = 'TEMPLATE_MISSING';

  console.log(error.message.replace(/\n/g, '\n  '));

  return Promise.reject(error);
};

module.exports = printBanner;
