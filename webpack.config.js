const Path = require('path');

module.exports = {
  entry: {
    ranger: './source/ranger.ts',
    merchant: './source/merchant.ts',
    warrior: './source/warrior.ts',
    mage: './source/mage.ts',
    priest: './source/priest.ts'
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/,
    }, ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: Path.resolve(__dirname, 'build'),
    library: "bots",
    libraryTarget: "window"
  }
};