const deepAssign = require('deep-assign');
const fs = require('fs-extra');

module.exports.merge = (filename, data) => {
  return fs.readJson(filename).then(manifest => {
    return deepAssign({}, manifest, data);
  })
  .catch((data) => {
    return data || {};
  })
  .then((data) => {
    console.log('updated: ', filename);
    return fs.writeJson(filename, data);
  })
};
