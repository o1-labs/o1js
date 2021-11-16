#!/bin/bash
node webpack/esbuild-web.mjs
pushd dist/web
python3 server.py