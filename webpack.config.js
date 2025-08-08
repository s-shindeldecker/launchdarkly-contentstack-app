const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    // Original HTML for development/testing
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    // New HTML wrapper for Contentstack
    new HtmlWebpackPlugin({
      template: './public/flag-selector.html',
      filename: 'flag-selector.html',
    }),
    // Config screen wrapper
    new HtmlWebpackPlugin({
      template: './public/config-screen.html',
      filename: 'config-screen.html',
    }),
    // Make environment variables available to the app
    new webpack.DefinePlugin({
      'process.env.LAUNCHDARKLY_API_KEY': JSON.stringify(process.env.LAUNCHDARKLY_API_KEY),
      'process.env.LAUNCHDARKLY_ENVIRONMENT': JSON.stringify(process.env.LAUNCHDARKLY_ENVIRONMENT),
      'process.env.REACT_APP_LAUNCHDARKLY_API_KEY': JSON.stringify(process.env.REACT_APP_LAUNCHDARKLY_API_KEY),
      'process.env.REACT_APP_LAUNCHDARKLY_ENVIRONMENT': JSON.stringify(process.env.REACT_APP_LAUNCHDARKLY_ENVIRONMENT),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
  },
}; 