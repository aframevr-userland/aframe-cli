// See docs: http://brunch.io/docs/config
module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'js/vendor.js': /^(?!app)/,  // Match files not in the `app` directory.
        'js/app.js': /^app/
      }
    },
    stylesheets: {
      joinTo: 'css/app.css'
    },
    templates: {
      joinTo: {
        'js/app.js': /^app\/templates/
      }
    }
  },
  npm: {
    globals: {
      AFRAME: 'aframe'
    }
  },
  paths: {
    public: '.public'
  },
  modules: {
    autoRequire: {
      'js/app.js': [
        'js/initialize.js'
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
        '.public/index.html'
      ],
      options: {
        staticFileGlobs: [
          '.public/**/!(*map*)'
        ],
        stripPrefix: '.public/'
      }
    }
  }
};
