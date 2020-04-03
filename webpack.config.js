const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'none',
  target: 'node',
  entry: './src/extension.ts',
  plugins: [
    new CleanWebpackPlugin()
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: "../[resource-path]"
  },
  devtool: 'source-map',
  externals: {
    vscode: "commonjs vscode"
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.(ejs|css)$/,
        use: [
          'raw-loader'
        ]
      }
    ]
  }
};
