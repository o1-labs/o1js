const path = require('path');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'node',

  devtool: false,

  mode: 'none',

  entry: {
    snarky: {
      import: path.resolve(__dirname, '../src/index.ts'),
      library: {
        name: 'snarky',
        type: 'umd',
        umdNamedDefine: true,
      },
    },
  },

  output: {
    path: path.resolve(__dirname, '../dist/server'),
    publicPath: '',
    filename: '[name].js',
    library: 'snarky',
    libraryTarget: 'umd',
    libraryExport: 'default',
    umdNamedDefine: true,
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'snarky.bindings.js$': './node_bindings/snarky_js_node.bc.es6.js'
    }
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: '../tsconfig.server.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules)|(\.bc.js)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/snarky.d.ts',
          to: '',
        },
      ],
    }),
  ],
};
