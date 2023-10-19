export {
  dummy as writeFileSync,
  dummy as readFileSync,
  dummy as resolve,
  dummy as mkdirSync,
};

function dummy() {
  throw Error('not implemented');
}
