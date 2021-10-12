const webConfig = require('./webpack.web.prod');
const nodeConfig = require('./webpack.node.prod');

module.exports = [webConfig, nodeConfig];
