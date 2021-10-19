const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'node',

  mode: 'production',

  devtool: false,

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

  externals: {
    './node_bindings/snarky_js_node.bc.js':
      'commonjs ./node_bindings/snarky_js_node.bc.js',
    './snarky_js_node.bc.js': 'commonjs ./snarky_js_node.bc.js',
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
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
          from: 'src/node_bindings/',
          to: 'node_bindings',
        },
        {
          from: 'src/snarky.d.ts',
          to: '',
        },
      ],
    }),
  ],

  experiments: { topLevelAwait: true },
};
