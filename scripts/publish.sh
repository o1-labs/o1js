#!/bin/bash
npm run prepublish:both
if [ -d "./dist" ] 
then
    cp package.json ./dist
    cd ./dist
    npm publish
else
    echo "Publishing Error: Couldn't build dist folder, try building again."
fi