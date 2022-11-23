import { randomBytes as randomBytesNode } from 'crypto';
export { randomBytes };

function randomBytes(n: number) {
  return new Uint8Array(randomBytesNode(n));
}
