# aframe-cli

A command-line tool for building A-Frame scenes.

> **⚠ NOTE:️ This is not meant to be used just yet. This is a WIP!**

> _TODO: Upstream changes to [`angle`](https://github.com/aframevr/angle)._


### Usage

```sh
npm install -g aframe-cli
aframe
```

### Commands

To get a list of all commands and options:

```sh
aframe --help
```

#### `aframe install <aframe-component-name> [scene-filename.html]`

Install a component from the [A-Frame Registry](https://aframe.io/registry) to an HTML file. This will detect the A-Frame version from your HTML file and install the appropriate version of the component as a `<script>` tag.

```sh
aframe install aframe-mountain-component
aframe install aframe-physics-system myaframescene-1.html
```

#### `aframe component`

[component]: https://aframe.io/docs/master/introduction/writing-a-component.html

Create a template in the working directory for an A-Frame component for publishing to the ecosystem. This command will ask several questions about your component to get things set up. See [how to write a component][component].

```sh
aframe component
```

To develop the component:

```sh
aframe component add aframe-mountain-component
```

To list all installed components for your active project:

```sh
aframe component list
```

To publish the component to the ecosystem:

```sh
npm publish
npm run ghpages
```

Then submit to the [A-Frame Registry](https://github.com/aframevr/aframe-registry).

#### `aframe create <name> [template]`

Bootstrap an A-Frame scene in the working directory.

```sh
aframe new
```

To specify a name for your scene:

```sh
aframe new "Spheres and Fog"
```

To include tracked hand-controls 3D models in your scene:

```sh
aframe new "Spheres and Fog" controllers
```
