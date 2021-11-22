#!/bin/bash
#npm run build:server
npm run prepublish:server
node --experimental-wasm-modules --experimental-modules --experimental-wasm-threads -i dist/server/index.js
