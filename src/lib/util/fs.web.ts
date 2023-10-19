export { dummy as writeFileSync, dummy as readFileSync, dummy as resolve };

function dummy() {
  throw Error('not implemented');
}
