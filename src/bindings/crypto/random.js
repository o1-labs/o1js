import { randomBytes as randomBytesNode } from 'crypto';
export { randomBytes };
function randomBytes(n) {
    return new Uint8Array(randomBytesNode(n));
}
