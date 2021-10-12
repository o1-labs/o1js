#!/bin/bash
npm run build:node
node --experimental-wasm-modules --experimental-modules --experimental-wasm-threads -i dist/node/snarky.js
