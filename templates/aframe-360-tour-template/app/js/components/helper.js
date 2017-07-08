AFRAME.registerComponent('hotspot-helper', {
  schema: {
    distance: { type: 'number', default: 5 },
    distanceIncrement: { type: 'number', default: 0.25 },
    target: { type: 'selector' },
    size: { type: 'number', default: 0.5 }
  },

  init: function () {
    var self = this;
    this.camera = document.querySelector('a-entity[camera]');

    // Helper UI
    var uiContainer = this.makeUi();
    document.body.appendChild(uiContainer);

    // coordinates
    this.out = uiContainer.querySelector('#hh-coordinates');

    // copy coordinates to clipboard
    var copyButton = uiContainer.querySelector('#hh-copy');
    copyButton.addEventListener('click', this.copyCordinates.bind(this));

    // set distance
    var distanceInput = uiContainer.querySelector('#hh-distance');
    distanceInput.addEventListener('input', function () {
      self.updateDistance(this.value);
    });
    distanceInput.value = this.data.distance;
    this.distanceInput = distanceInput;

    // mousewheel distance
    document.body.addEventListener('mousewheel', this.handleMouseWheel.bind(this));

    // reference mesh for position.
    var object = new THREE.Object3D();
    if (!this.data.target) {
      var geometry = new THREE.OctahedronGeometry( this.data.size );
      var material = new THREE.MeshBasicMaterial({ color: 0x00ff9c });
      object = new THREE.Mesh(geometry, material);
    }
    this.targetObject = object;

    this.dolly = new THREE.Object3D();
    this.dolly.add(object);
    this.el.object3D.add(this.dolly);
    this.updateDistance(this.data.distance);

    // set positioning on target so that clicks are not triggered when placing hotspot.
    if (this.data.target) {
      this.data.target.setAttribute('hotspot', { positioning: true });
    }
  },

  makeUi: function () {
    var uiContainer = document.createElement('div');
    var markup = `
    <style>
    #hh {
      position: absolute;
      top: 0; left: 0;
      padding: 10px;
      margin: 10px;
      background: #333333;
      color: white;
      font-family: Helvetica, Arial, Sans-Serif;
    }

    #hh h1 {
      margin: 0;
    }

    #hh section {
      margin: 20px 0 20px 0;
    }

    #hh .hh-tip {
      display: block;
      font-size: 0.75rem;
      color: rgb(148, 148, 148);
    }

    #hh input[type="text"] {
      border: none;
      background: rgb(108, 108, 108);
      color: white;
      padding: 5px;
    }

    #hh input[type="button"] {
      background: white;
      padding: 5px;
      border: none;
    }

    #hh input[type="button"]:active {
      background: rgb(47, 77, 135);
      color: white;
    }
    </style>
    <div id="hh">
      <h1>Hotspot-helper</h1>

      <section>
        <input id="hh-distance" size="5" type="text"></input> Hotspot distance
        <span class="hh-tip">Use mouse scroll to adjust distance</span>
      </section>

      <section>
        <input id="lookat" type="checkbox"/> Look at origin
      </section>

      <section>
        <input id="hh-coordinates" size="20" type="text" value="1.000 1.000 1.000"/>
        <input id="hh-copy" type="button" value="Copy to Clipboard"/>
      </section>
    </div>
    `
    uiContainer.innerHTML = markup;
    return uiContainer;
  },

  updateDistance: function (distance) {
    this.targetObject.position.z = -distance;
  },

  copyCordinates: function () {
    this.out.select();
    document.execCommand('copy');
    getSelection().removeAllRanges();
  },

  handleMouseWheel: function (e) {
    var input = this.distanceInput;
    var data = this.data;
    var increment = e.deltaY < 0 ? data.distanceIncrement : -data.distanceIncrement;
    var value = parseFloat(input.value) + increment;
    if (value < 0) value = 0;
    input.value = value;
    this.updateDistance(value);
  },

  tick: function () {
    var rotation = this.camera.object3D.getWorldRotation();
    this.dolly.rotation.copy(rotation);
    var position = this.targetObject.getWorldPosition();
    var cords = position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
    var target = this.data.target;
    if (target) {
      target.setAttribute('position', { x: position.x, y: position.y, z: position.z });
    }
    this.out.value = cords;
  }
});