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

1. Clone this git repository:

    ```sh
    git clone git@github.com:cvan/aframe-cli.git
    ```

2. Install the [Node](https://nodejs.org/en/download/) dependencies:

    ```sh
    npm install
    ```

3. Run the CLI:

    ```sh
    node index.js
    ```



### License

This source code, including all contributions, is provided under an [MIT License](LICENSE.md).
