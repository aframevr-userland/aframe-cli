window.AFRAME = require('aframe');
require('aframe-look-at-component');

require('./components/tour.js');
require('./components/panorama.js');
require('./components/hotspot.js');
require('./components/helper.js');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initialized app!!!');
});
