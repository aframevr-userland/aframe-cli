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
    }
  },
  npm: {
    globals: {
      AFRAME: 'aframe'
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
