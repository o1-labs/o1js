#!/bin/bash
npm run web:build-dev
pushd dist
python3 server.py

