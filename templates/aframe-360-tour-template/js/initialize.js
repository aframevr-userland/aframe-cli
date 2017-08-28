var pkg = require('../package.json');

var meta = {};
Object.keys(pkg.dependencies).forEach(function (depName) {
  meta['//unpkg.com/' + depName + '@' + pkg.dependencies[depName].replace(/^\^/, '')] = {
    // exports: 'AFRAME',
    // format: 'global'
  };
});
console.log(meta);

SystemJS.config({
  meta: meta
});

var requirePackage = function (pkgName) {
  // return require('//unpkg.com/' + pkgName + '@' + pkg.dependencies[pkgName].replace(/^\^/, ''));
};

// requirePackage('aframe');
// requirePackage('aframe-look-at-component');

require('aframe');
require('aframe-look-at-component');

require('./components/tour.js');
require('./components/panorama.js');
require('./components/hotspot.js');
require('./components/helper.js');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initialized app');
});
