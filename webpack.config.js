var path = require('path');
var webpack = require('webpack');

var BASE = path.join(__dirname, 'node_modules')

module.exports = {
  devtool: 'eval',
  entry: [
    'webpack-dev-server/client?http://localhost:' + (process.env.PORT || 3000),
    'webpack/hot/only-dev-server',
    './app/front/index'
  ],
  devServer: {
    contentBase: './app/static',
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/app/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ],
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      'react': path.join(__dirname, 'node_modules/react'),
      'react/lib/ReactMount': path.join(__dirname, 'node_modules/react/lib/ReactMount'),
      'react-hot': path.join(__dirname, 'node_modules/react-hot'),
      'formative': path.join(__dirname, '../form'),
      'flammable': path.join(__dirname, '../flammable'),
    },
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      loaders: [BASE + '/react-hot-loader', BASE + '/babel-loader?optional=bluebirdCoroutines&stage=0'],
      include: [
        path.join(__dirname, 'app/front'),
        path.join(__dirname, 'lib'),
        path.join(__dirname, '../form'),
        path.join(__dirname, '../flammable'),
      ]
    }, {
      test: /\.json$/,
      loader: 'json',
    }, {
      test: /\.less$/,
      loader: 'style!css!less',
    }]
  }
};
