const webConfig = require('./webpack.web.prod');
const serverConfig = require('./webpack.node.simple');

module.exports = [webConfig, serverConfig];
