#!/bin/bash
npm run build:server
node --experimental-wasm-modules --experimental-modules --experimental-wasm-threads -i dist/server/index.js
