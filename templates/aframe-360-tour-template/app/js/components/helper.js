/* global AFRAME, THREE */

AFRAME.registerComponent('hotspot-helper', {
  schema: {
    target: {type: 'selector'},
    distance: {type: 'number', default: 5},
    distanceIncrement: {type: 'number', default: 0.25},
  },

  init: function () {
    if (!this.data.target) {
      console.error('Hotspot-helper: You must specify a target element!');
      return;
    }

    var self = this;

    this.camera = document.querySelector('[camera]');
    this.targetRotationOrigin = this.data.target.getAttribute('rotation');
    this.targetPositionOrigin = this.data.target.getAttribute('position');

    // Helper UI.
    var uiContainer = this.makeUi();
    document.body.appendChild(uiContainer);

    // Enabled.
    this.enabled = uiContainer.querySelector('#hh-enabled');
    this.enabled.addEventListener('click', function () {
      uiContainer.dataset.enabled = !!self.enabled.checked;
    });

    // Set distance.
    var distanceInput = this.distanceInput = uiContainer.querySelector('#hh-distance');
    distanceInput.addEventListener('input', function () {
      self.updateDistance(this.value);
    });
    distanceInput.value = this.data.distance;

    // Copy position to clipboard.
    var copyPosition = uiContainer.querySelector('#hh-copy-position');
    copyPosition.addEventListener('click', function () {
      self.copyToClipboard(self.position);
    });

    // Mouse-wheel distance.
    window.addEventListener('wheel', this.handleWheel.bind(this));

    // Rotation.
    this.rotation = uiContainer.querySelector('#hh-rotation');

    // Copy rotation to clipboard.
    var copyRotation = uiContainer.querySelector('#hh-copy-rotation');
    copyRotation.addEventListener('click', function () {
      self.copyToClipboard(self.rotation);
    });

    // Look at.
    this.lookToggle = uiContainer.querySelector('#hh-lookat');

    // Position.
    this.position = uiContainer.querySelector('#hh-position');

    // Empty object3D for position.
    var targetObject = this.targetObject = new THREE.Object3D();
    this.dolly = new THREE.Object3D();
    this.dolly.add(targetObject);
    this.el.object3D.add(this.dolly);
    this.updateDistance(this.data.distance);

    // Set positioning on target so that clicks are not triggered when placing hotspot.
    this.data.target.setAttribute('hotspot', {positioning: true});
  },

  makeUi: function () {
    var uiContainer = document.createElement('div');
    uiContainer.id = 'hh';
    var markup = `
    <style>
      #hh-heading {
        font-family: Consolas, Andale Mono, monospace;
      }

      #hh {
        background: #333;
        color: #fff;
        font-family: Helvetica, Arial, sans-serif;
        left: 0;
        margin: 10px;
        padding: 10px;
        position: absolute;
        top: 0;
      }

      #hh h1 {
        margin: 0;
      }

      #hh h2 {
        font-weight: 200;
        margin: 10px 0;
      }

      #hh[data-enabled="false"] section {
        display: none;
      }

      #hh section {
        margin: 20px 0;
      }

      #hh .hh-check,
      #hh .hh-tip {
        display: block;
        font-size: .75rem;
        margin: 8px 0;
      }

      #hh .hh-tip {
        color: rgb(148,148,148);
      }

      #hh input[type="text"] {
        border: none;
        background: rgb(108,108,108);
        color: #fff;
        padding: 5px;
      }

      #hh input[type="button"] {
        background: #fff;
        border: none;
        padding: 5px;
      }

      #hh input[type="button"]:active {
        background: rgb(47,77,135);
        color: #fff;
      }
    </style>

    <h1 id="hh-heading" class="hh-heading">hotspot-helper</h1>

    <span class="hh-check">
      <label>
        <input id="hh-enabled" type="checkbox" checked> Enabled
      </label>
    </span>

    <section>
      <label>
        <input id="hh-distance" size="5" type="text"> Hotspot distance
        <span class="hh-tip">Use mouse scroll to adjust distance</span>
      </label>
    </section>

    <section>
      <label>
        <h2>Position</h2>
        <input id="hh-position" size="20" type="text" value="1.000 1.000 1.000">
        <input id="hh-copy-position" type="button" value="Copy to Position">
      </label>
    </section>

    <section>
      <h2><label for="hh-rotation">Rotation</label></h2>
      <input id="hh-rotation" size="20" type="text" value="1.000 1.000 1.000">
      <input id="hh-copy-rotation" type="button" value="Copy to Rotation">
      <label>
        <span class="hh-check">
          <input id="hh-lookat" type="checkbox"> Look at origin
        </span>
      </label>
    </section>
    `;
    uiContainer.innerHTML = markup;
    return uiContainer;
  },

  updateDistance: function (distance) {
    this.targetObject.position.z = -distance;
  },

  copyToClipboard: function (input) {
    input.select();
    document.execCommand('copy');
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  },

  handleWheel: function (e) {
    var input = this.distanceInput;
    var data = this.data;
    var increment = e.deltaY < 0 ? data.distanceIncrement : -data.distanceIncrement;
    var value = parseFloat(input.value) + increment;
    if (value < 0) {
      value = 0;
    }
    input.value = value;
    this.updateDistance(value);
  },

  updateRotation: function () {
    var target = this.data.target;
    if (this.lookToggle.checked) {
      if (!target.hasAttribute('look-at')) {
        target.setAttribute('look-at', '[camera]');
      }
      var worldRotation = this.data.target.object3D.getWorldRotation();
      this.rotation.value = this.toDeg(worldRotation.x).toFixed(2) + ' ' + this.toDeg(worldRotation.y).toFixed(2) + ' ' + this.toDeg(worldRotation.z).toFixed(2);
    } else {
      if (target.hasAttribute('look-at')) {
        target.removeAttribute('look-at');
      }
      this.rotation.value = `${this.targetRotationOrigin.x} ${this.targetRotationOrigin.y} ${this.targetRotationOrigin.z}`;
      target.setAttribute('rotation', this.targetRotationOrigin);
    }
  },

  toDeg: function (rad) {
    return rad * 180 / Math.PI;
  },

  tick: function () {
    var target = this.data.target;
    if (!target) return;
    if (this.enabled.checked) {
      var rotation = this.camera.object3D.getWorldRotation();
      this.dolly.rotation.copy(rotation);
      var position = this.targetObject.getWorldPosition();
      var cords = position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
      target.setAttribute('position', {
        x: position.x,
        y: position.y,
        z: position.z
      });
      this.position.value = cords;
      this.updateRotation();
    } else {
      target.setAttribute('position', this.targetPositionOrigin);
      target.setAttribute('rotation', this.targetRotationOrigin);
    }
  }
});
