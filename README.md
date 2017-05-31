# aframe-cli

A command-line tool for building, managing, and publishing A-Frame scenes.

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

#### `aframe new <name> [template]`

To create a new A-Frame scene in the working directory:

```sh
aframe new
```

To create a new A-Frame scene in a different directory:

```sh
aframe new my-project-directory
```

To bootstrap a new A-Frame scene from a boilerplate template:

```sh
aframe new my-project-directory --template default
```

From a GitHub repository (such as [`aframevr/aframe-default-template`](https://github.com/aframevr/aframe-default-template)):

```sh
aframe new my-project-directory --template aframevr/aframe-default-template
```

#### `aframe build <path> [options]`

To build the static files (i.e., HTML/CSS/JS) for your A-Frame scene in the working directory:

```sh
aframe build
```

The files will be written to the `.public` directory, by default, in your A-Frame project's working directory (you can override the `paths.public` value in your own custom Brunch config file). [This default Brunch config file](lib/brunch-config.js) will be used if a `brunch-config.js` file does not exist and the `--config <path>` flag is not passed when calling `aframe build`).

For other options, refer to the usage information returned from `aframe serve --help`:

```
  Command: aframe build

  Usage: build|b [options] [path]

  Build an A-Frame project in path (default: current directory).

  Options:

    -h, --help             output usage information
    -e, --env [setting]    specify a set of override settings to apply
    -p, --production       same as `--env production`
    -d, --debug [pattern]  print verbose debug output to stdout
    -j, --jobs [num]       parallelize the build
    -c, --config [path]    specify a path to Brunch config file
```

#### `aframe serve <path> [options]`

To start a local development server for your A-Frame scene from your project's directory:

```sh
aframe serve
```

The server (which defaults to listening on port `3333`) you can now load here: **[http://localhost:3333/](http://localhost:3333/)**

To create an A-Frame scene in a different directory:

```sh
aframe serve my-project-directory
```

To run in the production mode (how your site would look when published and deployed online):

```sh
aframe serve my-project-directory --production
```

To change the server port, for example, to `8080`:

```sh
aframe serve -P 8080
```

For other options, refer to the usage information returned from `aframe serve --help`:

```
  Command: aframe serve

  Usage: serve|s [options] [path]

  Serve an A-Frame project in path (default: current directory).

  Options:

    -h, --help             output usage information
    -e, --env [setting]    specify a set of override settings to apply
    -p, --production       same as `--env production`
    -s, --server           run a simple HTTP server for the public directory on localhost
    -n, --network          if `server` was given, allow access from the network
    -P, --port [port]      if `server` was given, listen on this port
    -d, --debug [pattern]  print verbose debug output to stdout
    -j, --jobs [num]       parallelize the build
    -c, --config [path]    specify a path to Brunch config file
    --stdin                listen to stdin and exit when stdin closes
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


### CLI development

To work on improving the `aframe` CLI in this repository, first ensure you've set up the project and installed the dependencies:

1. Clone this git repository, and open the directory created:

    ```sh
    git clone git@github.com:cvan/aframe-cli.git
    cd aframe-cli
    ```

2. Install the [Node](https://nodejs.org/en/download/) dependencies:

    ```sh
    npm install
    ```

3. Run the CLI:

    ```sh
    node index.js
    ```


### Creating a new A-Frame scene template (boilerplate project)

1. From the root directory (i.e., cloned checkout of this git repository), create a npm symlink for the `aframe` CLI (i.e., `bin` in this repository's root [`package.json`](package.json) file):

    ```sh
    npm link
    ```

2. Edit the metadata in the `templates/index.json`, adding a new object to the `templates` array. The only required keys are `alias`, `url`, and `title`.

3. Create a new directory in the `templates/` directory, by copying over the contents of the default template:

    ```sh
    mkdir -p templates/aframe-new-example-template/
    cp -r templates/aframe-default-template/{.gitignore,app,package.json} templates/aframe-new-example-template/.
    ```

4. Create a git repository for the new directory created (e.g., `templates/aframe-new-example-template/`):

    ```sh
    export TEMPLATE_NAME=aframe-new-example-template
    cd templates/$TEMPLATE_NAME/
    git init .
    git remote add origin git@github.com:aframevr-userland/$TEMPLATE_NAME.git
    ```

5. Open the new directory created (e.g., `templates/aframe-new-example-template/`), use the npm sylink for the `aframe` CLI, and install the [Node](https://nodejs.org/en/download/) dependencies:

    ```sh
    cd templates/aframe-new-example-template/
    npm link aframe-cli
    npm install
    ```

6. From within the template's directory (e.g., `templates/aframe-new-example-template/`), start the local development server:

    ```sh
    npm start
    ```

7. Now you can start building out this scene template!

8. Once you're done building the scene, create a [new repository on GitHub](https://github.com/organizations/aframevr-userland/repositories/new) in the [`aframevr-userland` organization](https://github.com/organizations/aframevr-userland), and publish the repository to GitHub:

    ```sh
    git push origin master -u
    ```

#### Adding components to an A-Frame scene template

1. Ensure you're in the template's directory:

    ```sh
    cd templates/aframe-new-example-template/
    ```

2. Install an A-Frame component you'd like to use in the template. (Check out the [A-Frame Registry](https://aframe.io/registry) or the [Awesome A-Frame list](https://github.com/aframevr/awesome-aframe#components).)

    ```sh
    npm install --save aframe-teleport-controls
    ```

3. Import the module from within the `app/js/initialize.js` JS file in the template's directory (e.g., `templates/aframe-new-example-template/`).

    ```js
    // For `teleport-controls` component.
    require('aframe-teleport-controls-component');
    ```

4. To make use of the component, update the scene's A-Frame HTML markup in the `app/assets/index.html` file, for example:

    ```html
    <a-scene>
      <a-entity teleport-controls vive-controls="hand: left"></a-entity>
    </a-scene>
    ```

4. Go wild!


### License

This source code, including all contributions, is provided under an [MIT License](LICENSE.md).
