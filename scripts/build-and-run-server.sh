#!/bin/bash
npm run build
node --experimental-wasm-modules --experimental-modules --experimental-wasm-threads -i dist/server/index.js
