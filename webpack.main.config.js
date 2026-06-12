const { rules } = require('./webpack.rules');
const { plugins } = require('./webpack.plugins');

// Add CSS loader rules
rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    { loader: 'postcss-loader' },
  ],
});

// Add image/font loaders
rules.push({
  test: /\.(?:ico|gif|png|jpg|jpeg|webp|svg)$/i,
  type: 'asset/resource',
});

rules.push({
  test: /\.woff2?$/i,
  type: 'asset/resource',
});

module.exports = {
  entry: './src/main/index.ts',
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};
