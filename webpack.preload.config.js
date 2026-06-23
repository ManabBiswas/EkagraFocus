const path = require('path');

module.exports = {
  target: 'electron-preload',
  mode: 'development',
  entry: './src/preload.ts',
  output: {
    path: path.resolve(__dirname, '.webpack', 'main'),
    filename: 'preload.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};