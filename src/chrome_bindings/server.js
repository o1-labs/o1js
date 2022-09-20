import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const port = 8000;
const defaultHeaders = {
  'content-type': 'text/html',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const server = http.createServer(async (req, res) => {
  let file = '.' + req.url;
  console.log(file);

  if (file === './') file = './index.html';
  let content;
  try {
    content = await fs.readFile(path.resolve('./dist/web', file), 'utf8');
  } catch (err) {
    res.writeHead(404, defaultHeaders);
    res.write('<html><body>404</body><html>');
    res.end();
    return;
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
