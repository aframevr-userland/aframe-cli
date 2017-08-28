const path = require('path');

const webpack = require('webpack');

const BabiliWebpackPlugin = require('babili-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = env => {
  const isProd = !!!(env && env.dev === true);

  let plugins = [];
  if (isProd) {
    plugins = [
      new BabiliWebpackPlugin(),
      new CleanWebpackPlugin(['build'])
    ];
  }

  return {
    entry: {
      app: './js/index.js'
    },
    output: {
      filename: 'build/bundle.js',
      path: __dirname
    },
    devServer: {
      disableHostCheck: true
    },
    plugins: plugins
  };
};
