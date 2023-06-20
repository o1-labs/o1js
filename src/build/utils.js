import fse from 'fs-extra';

export { copyFromTo };

async function copyFromTo(files, srcDir = undefined, targetDir = undefined) {
  let promises = [];
  for (let source of files) {
    let target = source.replace(`${srcDir}/`, `${targetDir}/`);
    promises.push(
      fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      })
    );
  }
  await Promise.all(promises);
}
