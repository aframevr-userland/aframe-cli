const path = require('path');

const clipboardy = require('clipboardy');
const request = require('request-promise-native');
const logger = require('loggy');
const opn = require('opn');

const submit = (siteUrl, options) => new Promise((resolve, reject) => {
  options = options || {};
  logger.log(`Submitting site "${siteUrl}" to the A-Frame Index …`);

  let submitted = false;

  setTimeout(() => {
    if (!submitted) {
      reject(new Error(`Could not reach the A-Frame Index API at https://index-api.aframe.io/ (timed out after ${options.timeout / 1000} seconds)`));
    }
  }, options.timeout);

  return request({
    method: 'POST',
    uri: 'https://index-api.aframe.io/api/manifests',
    form: {
      url: siteUrl
    },
    json: true
  }).then(json => {
    submitted = true;
    const worksUrl = `https://index-api.aframe.io/api/works/${json._work_idx}`;
    logger.log(`Submitted site "${siteUrl}": ${worksUrl}`);
    if (!options.noClipboard) {
      clipboardy.writeSync(worksUrl);
    }
    if (!options.noOpen) {
      // opn(worksUrl, {wait: false});
    }
    return worksUrl;
  }).then(() => {
    process.exit();
  }).catch(err => {
    logger.log(`Could not submit site "${siteUrl}" to the A-Frame Index: ` + (err ? err : 'Unknown Error'));
    throw err;
    process.exit(1);
  });
});

exports.submit = submit;
