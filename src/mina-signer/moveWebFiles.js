import glob from 'glob';
import { move } from 'fs-extra';

let webFiles = glob.sync('./dist/tmp/**/*.web.js');

await Promise.all(
  webFiles.map((file) =>
    move(file, file.replace('.web.js', '.js'), { overwrite: true })
  )
);
