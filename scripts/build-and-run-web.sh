#!/bin/bash
npm run build:web
pushd dist/web
python3 server.py

