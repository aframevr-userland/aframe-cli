module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'js/vendor.js': /^(?!app)/,
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
  plugins: {
    babel: {
      presets: ['es2015'],
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
