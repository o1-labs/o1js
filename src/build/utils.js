import fse from 'fs-extra';

export { copyFromTo };

function copyFromTo(files, srcDir = undefined, targetDir = undefined) {
  return Promise.all(
    files.map((source) => {
      let target = source.replace(srcDir, targetDir);
      return fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      });
    })
  );
}
