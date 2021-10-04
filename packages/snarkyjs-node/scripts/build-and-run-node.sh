#!/bin/bash
npm run build-dev
node --experimental-wasm-modules --experimental-modules --experimental-wasm-threads -i dist/snarky.js
