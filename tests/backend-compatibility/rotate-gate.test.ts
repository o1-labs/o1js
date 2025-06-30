import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend, Cache, Gadgets } from 'o1js';

const { rotate64, leftShift64, rightShift64 } = Gadgets;

describe('Backend Compatibility: Rotate Gate', () => {
  let originalBackend: string;

  beforeAll(async () => {
    await initializeBindings();
    originalBackend = getCurrentBackend();
  });

  afterAll(async () => {
    // Restore original backend
    await switchBackend(originalBackend as 'snarky' | 'sparky');
  });

  describe('Basic Rotation Tests', () => {
    test('rotate left by 4 bits', async () => {
      const testWord = Field(0x0123456789ABCDEFn);
      const expectedResult = Field(0x123456789ABCDEF0n);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyResult = rotate64(testWord, 4, 'left');
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyResult = rotate64(testWord, 4, 'left');
      
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      expect(sparkyResult.toBigInt()).toBe(expectedResult.toBigInt());
    });

    test('rotate right by 4 bits', async () => {
      const testWord = Field(0x0123456789ABCDEFn);
      const expectedResult = Field(0xF0123456789ABCDEn);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyResult = rotate64(testWord, 4, 'right');
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyResult = rotate64(testWord, 4, 'right');
      
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      expect(sparkyResult.toBigInt()).toBe(expectedResult.toBigInt());
    });

    test('rotate by 0 bits (no change)', async () => {
      const testWord = Field(0xFFFFFFFFFFFFFFFFn);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyResult = rotate64(testWord, 0, 'left');
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyResult = rotate64(testWord, 0, 'left');
      
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      expect(sparkyResult.toBigInt()).toBe(testWord.toBigInt());
    });

    test('rotate by 64 bits (full rotation)', async () => {
      const testWord = Field(0x0123456789ABCDEFn);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyResult = rotate64(testWord, 64, 'left');
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyResult = rotate64(testWord, 64, 'left');
      
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      expect(sparkyResult.toBigInt()).toBe(testWord.toBigInt());
    });

    test('rotate by various bit counts', async () => {
      const testWord = Field(0x0123456789ABCDEFn);
      const bitCounts = [1, 7, 8, 15, 16, 31, 32, 48, 63];
      
      for (const bits of bitCounts) {
        // Test left rotation
        await switchBackend('snarky');
        const snarkyLeft = rotate64(testWord, bits, 'left');
        
        await switchBackend('sparky');
        const sparkyLeft = rotate64(testWord, bits, 'left');
        
        expect(sparkyLeft.toBigInt()).toBe(snarkyLeft.toBigInt());
        
        // Test right rotation
        await switchBackend('snarky');
        const snarkyRight = rotate64(testWord, bits, 'right');
        
        await switchBackend('sparky');
        const sparkyRight = rotate64(testWord, bits, 'right');
        
        expect(sparkyRight.toBigInt()).toBe(snarkyRight.toBigInt());
      }
    });
  });

  describe('Shift Operations (using rotate gate)', () => {
    test('left shift by 8 bits', async () => {
      const testWord = Field(0x0123456789ABCDEFn);
      const expectedResult = Field(0x23456789ABCDEF00n);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyResult = leftShift64(testWord, 8);
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyResult = leftShift64(testWord, 8);
      
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      expect(sparkyResult.toBigInt()).toBe(expectedResult.toBigInt());
    });

    test('right shift by 8 bits', async () => {
      const testWord = Field(0x0123456789ABCDEFn);
      const expectedResult = Field(0x000123456789ABCDn);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyResult = rightShift64(testWord, 8);
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyResult = rightShift64(testWord, 8);
      
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      expect(sparkyResult.toBigInt()).toBe(expectedResult.toBigInt());
    });
  });

  describe('ZkProgram with Rotate Gates', () => {
    test('compile program with rotation operations', async () => {
      const RotateProgram = ZkProgram({
        name: 'rotate-test',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          rotateLeft16: {
            privateInputs: [],
            async method(input: Field) {
              // Use a constant rotation amount
              return { publicOutput: rotate64(input, 16, 'left') };
            }
          },
          rotateRight16: {
            privateInputs: [],
            async method(input: Field) {
              // Use a constant rotation amount
              return { publicOutput: rotate64(input, 16, 'right') };
            }
          }
        }
      });

      // Compile with both backends and compare verification keys
      await switchBackend('snarky');
      const { verificationKey: snarkyVK } = await RotateProgram.compile({ cache: Cache.None });
      
      await switchBackend('sparky');
      const { verificationKey: sparkyVK } = await RotateProgram.compile({ cache: Cache.None });
      
      // The verification keys should match
      expect(sparkyVK.data).toBe(snarkyVK.data);
      expect(sparkyVK.hash).toBe(snarkyVK.hash);
    });

    test('constraint count for rotation operations', async () => {
      let constraintCount = 0;
      
      const ConstraintCountProgram = ZkProgram({
        name: 'constraint-count',
        publicInput: undefined,
        methods: {
          testRotate: {
            privateInputs: [Field],
            async method(input: Field) {
              // This should generate exactly 11 constraints per rotation
              const rotated = rotate64(input, 16, 'left');
              rotated.assertEquals(rotated); // Just to use the result
            }
          }
        }
      });

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyResult = await ConstraintCountProgram.compile({ cache: Cache.None });
      const snarkyConstraints = snarkyResult.verificationKey.data
        .match(/\"constraint_system_digest\":\[\"(\d+)\"/)?.[1];
      
      // Compile with Sparky
      await switchBackend('sparky');
      const sparkyResult = await ConstraintCountProgram.compile({ cache: Cache.None });
      const sparkyConstraints = sparkyResult.verificationKey.data
        .match(/\"constraint_system_digest\":\[\"(\d+)\"/)?.[1];
      
      // Both should have the same constraint count
      expect(sparkyConstraints).toBe(snarkyConstraints);
    });
  });

  describe('Edge Cases and Special Values', () => {
    test('rotate all zeros', async () => {
      const testWord = Field(0);
      
      await switchBackend('snarky');
      const snarkyResult = rotate64(testWord, 32, 'left');
      
      await switchBackend('sparky');
      const sparkyResult = rotate64(testWord, 32, 'left');
      
      expect(sparkyResult.toBigInt()).toBe(0n);
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
    });

    test('rotate all ones', async () => {
      const testWord = Field(0xFFFFFFFFFFFFFFFFn);
      
      await switchBackend('snarky');
      const snarkyResult = rotate64(testWord, 17, 'right');
      
      await switchBackend('sparky');
      const sparkyResult = rotate64(testWord, 17, 'right');
      
      expect(sparkyResult.toBigInt()).toBe(0xFFFFFFFFFFFFFFFFn);
      expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
    });

    test('rotate single bit patterns', async () => {
      // Test rotating a single bit through all positions
      for (let bitPos = 0; bitPos < 64; bitPos++) {
        const testWord = Field(1n << BigInt(bitPos));
        
        await switchBackend('snarky');
        const snarkyResult = rotate64(testWord, 1, 'left');
        
        await switchBackend('sparky');
        const sparkyResult = rotate64(testWord, 1, 'left');
        
        const expectedBitPos = (bitPos + 1) % 64;
        const expectedValue = 1n << BigInt(expectedBitPos);
        
        expect(sparkyResult.toBigInt()).toBe(expectedValue);
        expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      }
    });
  });

  describe('Keccak-like Rotation Patterns', () => {
    test('rotate by Keccak rotation amounts', async () => {
      // These are actual rotation amounts used in Keccak
      const keccakRotations = [
        0, 36, 3, 41, 18,
        1, 44, 10, 45, 2,
        62, 6, 43, 15, 61,
        28, 55, 25, 21, 56,
        27, 20, 39, 8, 14
      ];
      
      const testWord = Field(0x0123456789ABCDEFn);
      
      for (const rotation of keccakRotations) {
        await switchBackend('snarky');
        const snarkyResult = rotate64(testWord, rotation, 'left');
        
        await switchBackend('sparky');
        const sparkyResult = rotate64(testWord, rotation, 'left');
        
        expect(sparkyResult.toBigInt()).toBe(snarkyResult.toBigInt());
      }
    });
  });
});