// See docs: http://brunch.io/docs/config
module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'js/vendor.js': /^(?!app)/,  // Match files not in the `app` directory.
        'js/bundle.js': /^app/
      }
    },
    stylesheets: {
      joinTo: 'css/bundle.css'
    },
    templates: {
      joinTo: {
        'js/bundle.js': /^app\/templates/
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
      'js/bundle.js': [
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
