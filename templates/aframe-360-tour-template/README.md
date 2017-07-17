# A-Frame 360 tour template

String together a tour with hotspots using 360&deg; panorama images.

## Usage

### Basic setup

1. Install A-Frame CLI.   [See Installation instructions](https://github.com/aframevr-userland/aframe-cli/blob/master/README.md)

2. Create a new A-Frame project with the 360 tour template:
    ```bash
    aframe new my-360-tour --template 360-tour
    ```

3. Run local development server from your project's directory.
    ```bash
    cd my-360-tour
    aframe serve
    ```

### Template Usage

1. setup a tour and define panorama images.
    ```html
    <a-tour>
      <a-panorama id="livingroom" src="images/livingroom.jpg"></a-panorama>
      <a-panorama id="kitchen" src="images/kitchen.jpg"></a-panorama>
    </a-tour>
    ```

2. Define the hotspots for each panorama

    ```html
    <a-tour>
      <!-- sets a hotspot from livingroom to kitchen -->
      <a-hotspot for="livingroom" to="kitchen" mixin="hotspot-target" position="5 0 0"></a-hotspot>
      <!-- sets a hotspot from kitchen to livingroom -->
      <a-hotspot for="kitchen" to="livingroom" mixin="hotspot-target" position="2 0 5"></a-hotspot>
    </a-tour>
    ```

3. Style hotspots

    We use a _mixin_ to set the hotspot style:

    ```html
    <a-assets>
      <a-mixin id="hotspot-target" geometry="primitive: sphere; radius: 0.15" material="color: yellow"></a-mixin>
    </a-assets>
    ```

### Hotspot-helper

![Hotspot Helper](https://raw.githubusercontent.com/aframevr-userland/aframe-cli/master/templates/aframe-360-tour-template/images/hotspot-helper.png)

Included in the tour template is a `hotspot-helper` component that helps make it
easier to place hotspots in your scene. To use the helper, add it to `<a-tour>`
and set it to target the hotspot you want to place.

```html
<a-tour hotspot-helper="target: #my-hotspot">
  <!-- sets a hotspot from livingroom to kitchen -->
  <a-hotspot id="my-hotspot" for="livingroom" to="kitchen"></a-hotspot>
</a-tour>
```

Once you have found a good placement for your hotspot, copy the `position` and `rotation`
values into the hotspot markup.