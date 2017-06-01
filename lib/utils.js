const { exec } = require('child_process');
const path = require('path');

const fs = require('fs-extra');

module.exports.getBrunchConfigPath = (filePath, options) => {
  filePath = filePath || process.cwd();
  options = options || {};

  if (options.config) {
    return options.config;
  }

  let brunchConfigPath = path.join(filePath, 'brunch-config.js');
  if (fs.existsSync(brunchConfigPath)) {
    return brunchConfigPath;
  }

  return path.join(__dirname, 'brunch-config.js');
};

/**
 * Promisified `child_process.exec`.
 *
 * @param cmd
 * @param opts See `child_process.exec` Node docs: https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
 * @param {stream.Writable} opts.stdout If defined, child process stdout will be piped to it.
 * @param {stream.Writable} opts.stderr If defined, child process stderr will be piped to it.
 *
 * @returns {Promise<{ stdout: string, stderr: stderr }>}
 */
module.exports.execp = (cmd, opts) => {
  opts || (opts = {});
  if (!('stdout' in opts)) {
    opts.stdout = process.stdout;
  }
  if (!('stderr' in opts)) {
    opts.stderr = process.stderr;
  }
  return new Promise((resolve, reject) => {
    const child = exec(cmd, opts,
      (err, stdout, stderr) => err ? reject(err) : resolve({
        stdout: stdout,
        stderr: stderr
      }));
    if (opts.stdout) {
      child.stdout.pipe(opts.stdout);
    }
    if (opts.stderr) {
      child.stderr.pipe(opts.stderr);
    }
  });
};
