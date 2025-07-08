import { move } from 'fs-extra';
import glob from 'glob';

let webFiles = glob.sync('./dist/tmp/**/*.web.js');

await Promise.all(
  webFiles.map((file) => move(file, file.replace('.web.js', '.js'), { overwrite: true }))
);
