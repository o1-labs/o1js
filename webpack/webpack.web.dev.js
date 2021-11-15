const path = require('path');

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: ['web', 'es2020'],
  devtool: false,
  mode: 'none',

  entry: {
    index: {
      import: path.resolve(__dirname, '../src/index.ts'),
    },
  },

  output: {
    path: path.resolve(__dirname, '../dist/web'),
    publicPath: 'auto',
    filename: '[name].js',
    library: {
      type: 'module',
    },
    module: true,
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /\.bc.js$/,
          name: 'snarky_js_chrome.bc',
          chunks: 'all',
        },
      },
    },
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: '../tsconfig.web.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
      // {
      //   test: /\.m?js$/,
      //   exclude: /(node_modules)|(\.bc.js)/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       presets: ['@babel/preset-env'],
      //       plugins: ['@babel/plugin-transform-runtime'],
      //     },
      //   },
      // },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),
    new NodePolyfillPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/chrome_bindings/index.html',
          to: '',
        },
        {
          from: 'src/chrome_bindings/server.py',
          to: '',
        },
        {
          from: 'src/chrome_bindings/snarky_js_chrome_ORIGINAL.bc.js',
          to: 'snarky_js_chrome.bc.js',
        },
        {
          from: 'src/chrome_bindings/worker_init.js',
          to: '',
        },
        {
          from: 'src/chrome_bindings/worker_run.js',
          to: '',
        },
        {
          from: 'src/chrome_bindings/plonk_wasm.js',
          to: '',
        },
        {
          from: 'src/chrome_bindings/plonk_wasm_bg.wasm',
          to: '',
        },
        {
          from: 'src/chrome_bindings/snippets',
          to: 'snippets',
        },
        {
          from: 'src/snarky.d.ts',
          to: '',
        },
      ],
    }),
  ],

  experiments: { topLevelAwait: true, outputModule: true },
};
