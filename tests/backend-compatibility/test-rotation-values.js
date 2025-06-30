// Test rotation values to understand the expected behavior

function rot(x, bits, direction = 'left', maxBits = 64n) {
  if (direction === 'right') bits = maxBits - bits;
  let full = x << bits;
  let excess = full >> maxBits;
  let shifted = full & ((1n << maxBits) - 1n);
  return shifted | excess;
}

// Test case from the failing test
const input = 0x0123456789ABCDEFn;
console.log('Input:', input.toString(16).padStart(16, '0'));

// Rotate right by 4
const result = rot(input, 4n, 'right');
console.log('Rotate right 4:', result.toString(16).padStart(16, '0'));
console.log('Expected:       f0123456789abcde');

// Let's understand step by step
console.log('\nStep by step for right rotation by 4:');
console.log('1. Convert to left rotation: 64 - 4 = 60');
const leftBits = 60n;
console.log('2. Shift left by 60:', (input << leftBits).toString(16));
console.log('3. Excess (bits beyond 64):', ((input << leftBits) >> 64n).toString(16));
console.log('4. Shifted (masked to 64 bits):', ((input << leftBits) & ((1n << 64n) - 1n)).toString(16));

// Test with all ones
console.log('\n\nTesting with all ones (0xFFFFFFFFFFFFFFFF):');
const allOnes = 0xFFFFFFFFFFFFFFFFn;
console.log('Input:', allOnes.toString(16));
const allOnesRotated = rot(allOnes, 17n, 'right');
console.log('Rotate right 17:', allOnesRotated.toString(16));

// Test 0 rotation
console.log('\n\nTesting 0 rotation:');
const zeroRotated = rot(input, 0n, 'left');
console.log('Rotate 0:', zeroRotated.toString(16));
console.log('Should equal input:', zeroRotated === input);