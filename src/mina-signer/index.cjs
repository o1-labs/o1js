// this file is a wrapper for supporting commonjs imports

const Client = require('./mina-signer.js');

module.exports = Client.default;
