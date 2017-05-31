document.addEventListener('DOMContentLoaded', () => {
  console.log('Initialized app');
});

AFRAME.registerComponent('teleport', {
  play: function () {
    this.el.addEventListener('click', this.handleClick.bind(this));
  },

  pause: function () {
    this.el.removeEventListener('click', this.handleClick.bind(this));
  },

  handleClick: function (e) {
    var camera = this.el.sceneEl.camera.el;
    var hotspotPosition = e.target.getAttribute('position');
    var hotspotRotation = e.target.getAttribute('rotation');
    var cameraPosition = camera.getAttribute('position');
    camera.setAttribute('position', {
      x: hotspotPosition.x,
      y: cameraPosition.y,
      z: hotspotPosition.z
    });
    camera.setAttribute('rotation', {
      y: hotspotRotation.y
    });
  }
});