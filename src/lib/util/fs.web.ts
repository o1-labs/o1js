export {
  dummy as writeFileSync,
  dummy as readFileSync,
  dummy as resolve,
  dummy as mkdirSync,
  cacheDir,
};

function dummy() {
  throw Error('not implemented');
}

function cacheDir() {
  return '';
}
