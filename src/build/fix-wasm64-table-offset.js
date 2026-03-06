/**
 * Fix LLVM bug in wasm64 element segment offsets.
 *
 * When compiling for wasm64-unknown-unknown with table64, LLVM/lld generates
 * incorrect element segment offsets. The offset i64.const value is corrupted
 * (e.g., 4294967297 = 0x100000001 instead of 1). This script reads the wasm
 * binary, finds element segment offsets with i64.const, and fixes the value
 * to the correct offset (lower 32 bits).
 *
 * Usage: node fix-wasm64-table-offset.js <wasm-file>
 */
import fs from 'node:fs';

const file = process.argv[2];
const buf = fs.readFileSync(file);

function readLEB128(buf, pos) {
  let result = 0n;
  let shift = 0n;
  let byte;
  const start = pos;
  do {
    byte = buf[pos++];
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
  } while (byte & 0x80);
  // Sign extend if negative
  if (byte & 0x40) {
    result |= -(1n << shift);
  }
  return [result, pos, start];
}

function writeLEB128Signed(value, maxBytes) {
  const bytes = [];
  const bigVal = BigInt(value);
  let v = bigVal;
  for (let i = 0; i < maxBytes; i++) {
    let byte = Number(v & 0x7fn);
    v >>= 7n;
    const isLast = i === maxBytes - 1;
    if (!isLast) {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

let pos = 8; // skip magic + version
let fixed = false;

while (pos < buf.length) {
  const sectionId = buf[pos++];
  let [size, newPos] = readLEB128(buf, pos);
  pos = Number(newPos);
  const sectionEnd = pos + Number(size);

  if (sectionId === 9) { // element section
    let [count, p] = readLEB128(buf, pos);
    pos = Number(p);

    for (let i = 0; i < Number(count); i++) {
      const flags = buf[pos++];

      if (flags === 0x02 || flags === 0x06) {
        // Has explicit table index, skip it
        let [, p1] = readLEB128(buf, pos);
        pos = Number(p1);
      }

      // Read offset expression
      const opcode = buf[pos];
      if (opcode === 0x42) { // i64.const
        pos++; // skip opcode
        let [val, p2, valStart] = readLEB128(buf, pos);
        const correctVal = val & 0xFFFFFFFFn; // Keep only lower 32 bits

        if (val !== correctVal && correctVal < 65536n) {
          console.log(`Fixing element segment ${i} offset: ${val} -> ${correctVal}`);

          // Rewrite the LEB128 value in place
          // i64 LEB128 can be up to 10 bytes. We need to write the correct value
          // in the same number of bytes to avoid shifting the entire binary.
          const originalBytes = Number(p2) - valStart;
          const newBytes = writeLEB128Signed(Number(correctVal), originalBytes);

          for (let j = 0; j < newBytes.length; j++) {
            buf[valStart + j] = newBytes[j];
          }
          fixed = true;
          pos = Number(p2);
        } else {
          pos = Number(p2);
        }
      } else {
        // Not i64.const, skip
        pos++;
        let [, p2] = readLEB128(buf, pos);
        pos = Number(p2);
      }

      // Skip the end opcode (0x0b)
      if (buf[pos] === 0x0b) pos++;

      // Skip the function indices
      if ((flags & 0x03) === 0x00 || (flags & 0x03) === 0x02) {
        // funcidx vector
        let [vecLen, p3] = readLEB128(buf, pos);
        pos = Number(p3);
        for (let j = 0; j < Number(vecLen); j++) {
          let [, p4] = readLEB128(buf, pos);
          pos = Number(p4);
        }
      } else {
        // expression vector (ref types)
        let [vecLen, p3] = readLEB128(buf, pos);
        pos = Number(p3);
        // Skip expressions - this is complex, just break for now
        break;
      }
    }
    break;
  }
  pos = sectionEnd;
}

if (fixed) {
  fs.writeFileSync(file, buf);
  console.log('Fixed element segment offsets in', file);
} else {
  console.log('No element segment offsets needed fixing in', file);
}
