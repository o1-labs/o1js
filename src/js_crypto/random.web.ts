export { randomBytes };

function randomBytes(n: number) {
  return crypto.getRandomValues(new Uint8Array(n));
}
