#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import minimist from 'minimist';
import { build } from './src/build/build-example.js';

let {
  _: [filePath],
} = minimist(process.argv.slice(2));

if (!filePath) {
  console.log(`Usage:
./run-in-browser [file]`);
  process.exit(0);
}

// copy file into /dist/web
let targetDir = `./dist/web`;

let absPath = await build(filePath, true);
let fileName = path.basename(absPath);

let newPath = `${targetDir}/${fileName}`;
await fs.copyFile(absPath, newPath);
await fs.unlink(absPath);
console.log(`running in the browser: ${newPath}`);

const indexHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="data:," />
    <title>o1js</title>
    <link rel="modulepreload" href="./index.js">
    <script type="module" src="./${fileName}">
    </script>
  </head>
  <body>
    <div>Check out the console (F12)</div>
  </body>
</html>

`;

const port = 8000;
const defaultHeaders = {
  'content-type': 'text/html',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const server = http.createServer(async (req, res) => {
  let file = '.' + req.url;
  if (file === './') file = './index.html';
  // console.log('serving', file);

  let content;
  if (file === './index.html') content = indexHtml;
  else {
    try {
      content = await fs.readFile(path.resolve('./dist/web', file), 'utf8');
    } catch (err) {
      res.writeHead(404, defaultHeaders);
      res.write('<html><body>404</body><html>');
      res.end();
      return;
    }
  }

  const extension = path.basename(file).split('.').pop();
  const contentType = {
    html: 'text/html',
    js: 'application/javascript',
    map: 'application/json',
  }[extension];
  const headers = { ...defaultHeaders, 'content-type': contentType };

  res.writeHead(200, headers);
  res.write(content);
  res.end();
});

server.listen(port, () => {
  console.log(`Server is running on: http://localhost:${port}`);
});
