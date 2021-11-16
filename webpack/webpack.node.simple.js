const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'node',
  devtool: false,
  mode: 'none',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, '../dist/server'),
    filename: 'index.js',
    library: {
      name: 'index',
      type: 'umd',
      umdNamedDefine: true,
    },
    clean: true,
  },

  externals: {
    './node_bindings/snarky_js_node.bc.js':
      'commonjs ./node_bindings/snarky_js_node.bc.js',
    './snarky_js_node.bc.js': 'commonjs ./snarky_js_node.bc.js',
    'reflect-metadata': 'commonjs reflect-metadata',
    tslib: 'commonjs tslib',
  },

  resolve: {
    extensions: ['.node.ts', '.node.js', '.ts', '.js'],
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
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'src/node_bindings/', to: 'node_bindings' },
        { from: 'src/snarky.d.ts', to: '' },
      ],
    }),
  ],
};
