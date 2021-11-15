#!/bin/bash
node webpack/esbuild-web.mjs
pushd dist/web-esbuild
python3 server.py