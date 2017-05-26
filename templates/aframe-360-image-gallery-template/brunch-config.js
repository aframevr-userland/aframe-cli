// See docs: http://brunch.io/docs/config
module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'js/app.js': /^(app|node_modules)/,
        'js/vendor.js': /^(?!app)/  // Match files not in the `app` directory.
      }
    },
    stylesheets: {
      joinTo: 'css/app.css'
    }
  },
  modules: {
    autoRequire: {
      'js/app.js': [
        'js/initialize'
      ]
    }
  },
  plugins: {
    babel: {
      presets: [
        'latest',
        'stage-0'
      ],
      ignore: [
        /^(node_modules)/
      ]
    },
    swPrecache: {
      autorequire: [
        'public/index.html'
      ],
      options: {
        staticFileGlobs: [
          'public/**/!(*map*)'
        ],
        stripPrefix: 'public/'
      }
    }
  }
};
