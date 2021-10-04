#!/bin/bash
npm run build-dev
pushd dist
python3 server.py

