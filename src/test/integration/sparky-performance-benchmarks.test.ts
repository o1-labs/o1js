/**
 * Performance Benchmark Tests for Sparky Backend
 * 
 * This test suite measures and compares performance between Sparky and Snarky backends
 * across various operations to ensure performance parity.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { Field, Bool, Scalar, Group, Poseidon, Provable, ZkProgram, createForeignField, switchBackend, Gadgets } from '../../../dist/node/index.js';

// Performance measurement utilities
interface BenchmarkResult {
  snarky: number;
  sparky: number;
  ratio: number;
  operations: number;
}

async function benchmark(
  name: string,
  operations: number,
  testFn: () => void | Promise<void>
): Promise<BenchmarkResult> {
  // Warmup
  for (let i = 0; i < 10; i++) {
    await testFn();
  }
  
  // Benchmark with Snarky
  await switchBackend('snarky');
  const snarkyStart = performance.now();
  for (let i = 0; i < operations; i++) {
    await testFn();
  }
  const snarkyTime = performance.now() - snarkyStart;
  
  // Benchmark with Sparky
  await switchBackend('sparky');
  const sparkyStart = performance.now();
  for (let i = 0; i < operations; i++) {
    await testFn();
  }
  const sparkyTime = performance.now() - sparkyStart;
  
  const ratio = sparkyTime / snarkyTime;
  
  console.log(`\n${name}:`);
  console.log(`  Snarky: ${snarkyTime.toFixed(2)}ms (${(snarkyTime/operations).toFixed(2)}ms/op)`);
  console.log(`  Sparky: ${sparkyTime.toFixed(2)}ms (${(sparkyTime/operations).toFixed(2)}ms/op)`);
  console.log(`  Ratio: ${ratio.toFixed(2)}x`);
  
  return {
    snarky: snarkyTime,
    sparky: sparkyTime,
    ratio,
    operations
  };
}

describe('Sparky Performance Benchmarks', () => {
  // Target performance ratio - Sparky should be within this factor of Snarky
  const MAX_ACCEPTABLE_RATIO = 1.5; // 50% slower is acceptable
  
  beforeAll(async () => {
    // Ensure we start with Snarky backend
    await switchBackend('snarky');
  });

  describe('Field Operation Benchmarks', () => {
    it('should have comparable performance for basic field arithmetic', async () => {
      const result = await benchmark('Field Arithmetic', 10000, () => {
        const a = Field(123456789n);
        const b = Field(987654321n);
        
        const c = a.add(b);
        const d = c.mul(a);
        const e = d.square();
        const f = e.div(b);
        const g = f.neg();
        
        // Force evaluation
        g.toBigInt();
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for witness generation', async () => {
      const result = await benchmark('Witness Generation', 1000, async () => {
        await Provable.runAndCheck(() => {
          const witnesses = [];
          for (let i = 0; i < 100; i++) {
            witnesses.push(Provable.witness(Field, () => Field(i)));
          }
          
          // Use witnesses to prevent optimization
          let sum = witnesses[0];
          for (let i = 1; i < witnesses.length; i++) {
            sum = sum.add(witnesses[i]);
          }
          sum.assertEquals(sum);
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for constraint generation', async () => {
      const result = await benchmark('Constraint Generation', 100, async () => {
        const cs = await Provable.constraintSystem(() => {
          const a = Provable.witness(Field, () => Field(1));
          const b = Provable.witness(Field, () => Field(2));
          
          for (let i = 0; i < 50; i++) {
            const c = a.mul(b);
            const d = c.add(a);
            d.assertEquals(d);
          }
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });
  });

  describe('Poseidon Hash Benchmarks', () => {
    it('should have comparable performance for Poseidon.hash', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => Field(i));
      
      const result = await benchmark('Poseidon Hash', 1000, () => {
        const hash = Poseidon.hash(inputs);
        hash.toBigInt(); // Force evaluation
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for Poseidon sponge', async () => {
      const result = await benchmark('Poseidon Sponge', 500, () => {
        const sponge = new Poseidon.Sponge();
        
        for (let i = 0; i < 20; i++) {
          sponge.absorb(Field(i));
        }
        
        for (let i = 0; i < 5; i++) {
          const squeezed = sponge.squeeze();
          squeezed.toBigInt(); // Force evaluation
        }
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for Poseidon in circuits', async () => {
      const result = await benchmark('Poseidon in Circuit', 50, async () => {
        await Provable.runAndCheck(() => {
          const inputs = [];
          for (let i = 0; i < 5; i++) {
            inputs.push(Provable.witness(Field, () => Field(i)));
          }
          
          const hash = Poseidon.hash(inputs);
          hash.assertEquals(hash);
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });
  });

  describe('Elliptic Curve Benchmarks', () => {
    it('should have comparable performance for EC addition', async () => {
      const g = Group.generator;
      
      const result = await benchmark('EC Addition', 1000, () => {
        let point = g;
        for (let i = 0; i < 10; i++) {
          point = point.add(g);
        }
        // Force evaluation
        point.x.toBigInt();
        point.y.toBigInt();
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for EC scalar multiplication', async () => {
      const g = Group.generator;
      const scalar = Scalar.from(12345n);
      
      const result = await benchmark('EC Scalar Multiplication', 100, () => {
        const point = g.scale(scalar);
        // Force evaluation
        point.x.toBigInt();
        point.y.toBigInt();
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for EC operations in circuits', async () => {
      const result = await benchmark('EC in Circuit', 20, async () => {
        await Provable.runAndCheck(() => {
          const scalar = Provable.witness(Scalar, () => Scalar.from(42));
          const g = Group.generator;
          
          const p1 = g.scale(scalar);
          const p2 = g.add(g);
          const p3 = p1.add(p2);
          
          p3.assertEquals(p3);
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });
  });

  describe('Range Check Benchmarks', () => {
    it('should have comparable performance for range checks', async () => {
      const result = await benchmark('Range Checks', 100, async () => {
        await Provable.runAndCheck(() => {
          const values = [];
          for (let i = 0; i < 10; i++) {
            values.push(Provable.witness(Field, () => Field(1n << BigInt(i))));
          }
          
          values.forEach(v => Gadgets.rangeCheck32(v));
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for 64-bit range checks', async () => {
      const result = await benchmark('64-bit Range Checks', 50, async () => {
        await Provable.runAndCheck(() => {
          const value = Provable.witness(Field, () => Field(1n << 63n));
          Gadgets.rangeCheck64(value);
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });
  });

  describe('Foreign Field Benchmarks', () => {
    it('should have comparable performance for foreign field operations', async () => {
      const secp256k1 = createForeignField(
        0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn
      );

      const result = await benchmark('Foreign Field Operations', 500, () => {
        const a = secp256k1.from(123456789n);
        const b = secp256k1.from(987654321n);
        
        const c = a.add(b);
        // For multiplication, need AlmostReduced
        const aReduced = a.assertAlmostReduced();
        const cReduced = c.assertAlmostReduced();
        const d = cReduced.mul(aReduced);
        const e = d.sub(b);
        const f = e.neg();
        
        // Force evaluation
        f.toBigInt();
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });

    it('should have comparable performance for foreign field in circuits', async () => {
      const secp256k1 = createForeignField(
        0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn
      );

      const result = await benchmark('Foreign Field in Circuit', 20, async () => {
        await Provable.runAndCheck(() => {
          const a = Provable.witness(secp256k1.AlmostReduced.provable, () => secp256k1.AlmostReduced.from(42n));
          const b = Provable.witness(secp256k1.AlmostReduced.provable, () => secp256k1.AlmostReduced.from(123n));
          
          const c = a.add(b);
          const cReduced = c.assertAlmostReduced();
          const d = cReduced.mul(a);
          
          d.assertEquals(d);
        });
      });
      
      expect(result.ratio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });
  });

  describe('Complex Circuit Benchmarks', () => {
    it('should have comparable performance for circuit compilation', async () => {
      const TestProgram = ZkProgram({
        name: 'BenchmarkProgram',
        publicInput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field],
            async method(pub: Field, a: Field, b: Field) {
              const c = a.mul(b);
              const d = c.add(pub);
              const hash = Poseidon.hash([a, b, c, d]);
              hash.assertEquals(hash);
            },
          },
        },
      });

      const result = await benchmark('Circuit Compilation', 5, async () => {
        await TestProgram.compile();
      });
      
      // Compilation might be slower, allow 2x ratio
      expect(result.ratio).toBeLessThan(2.0);
    });

    it('should have comparable performance for proving', async () => {
      const TestProgram = ZkProgram({
        name: 'ProvingBenchmark',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field],
            async method(pub: Field, priv: Field) {
              const sum = pub.add(priv);
              Gadgets.rangeCheck32(sum);
              return { publicOutput: Poseidon.hash([sum]) };
            },
          },
        },
      });

      // Compile once with each backend
      await switchBackend('snarky');
      await TestProgram.compile();
      
      await switchBackend('sparky');
      await TestProgram.compile();

      const result = await benchmark('Proving', 10, async () => {
        await TestProgram.compute(Field(100), Field(200));
      });
      
      // Proving might be slower, allow 2x ratio
      expect(result.ratio).toBeLessThan(2.0);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should have comparable memory usage patterns', async () => {
      // This is a basic memory usage test
      // In a real benchmark, you'd want to use process.memoryUsage() in Node.js
      
      const measureMemoryImpact = async (): Promise<void> => {
        const objects = [];
        
        for (let i = 0; i < 1000; i++) {
          objects.push(Field(i));
          objects.push(Bool(i % 2 === 0));
          objects.push(Group.generator.scale(Scalar.from(i)));
        }
        
        // Force evaluation
        objects.forEach((obj: any) => {
          if (obj.toBigInt) obj.toBigInt();
          else if (obj.toBoolean) obj.toBoolean();
          else if (obj.x) {
            obj.x.toBigInt();
            obj.y.toBigInt();
          }
        });
        
        // Return void instead of number
        return;
      };

      const result = await benchmark('Memory Usage Pattern', 10, measureMemoryImpact);
      
      // Memory patterns might differ more, allow 3x ratio
      expect(result.ratio).toBeLessThan(3.0);
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance summary report', async () => {
      const benchmarks = [
        { name: 'Field Operations', ops: 10000, fn: () => {
          const a = Field(42);
          const b = a.mul(Field(2)).add(Field(1));
          b.toBigInt();
        }},
        { name: 'Poseidon Hash', ops: 1000, fn: () => {
          const hash = Poseidon.hash([Field(1), Field(2), Field(3)]);
          hash.toBigInt();
        }},
        { name: 'EC Operations', ops: 100, fn: () => {
          const g = Group.generator;
          const p = g.add(g).scale(Scalar.from(3));
          p.x.toBigInt();
        }},
      ];

      console.log('\n=== PERFORMANCE SUMMARY ===\n');
      
      let totalSnarky = 0;
      let totalSparky = 0;
      
      for (const bench of benchmarks) {
        const result = await benchmark(bench.name, bench.ops, bench.fn);
        totalSnarky += result.snarky;
        totalSparky += result.sparky;
      }
      
      const overallRatio = totalSparky / totalSnarky;
      console.log(`\nOverall Performance Ratio: ${overallRatio.toFixed(2)}x`);
      console.log(`Total Snarky Time: ${totalSnarky.toFixed(2)}ms`);
      console.log(`Total Sparky Time: ${totalSparky.toFixed(2)}ms`);
      
      // Overall should be within acceptable range
      expect(overallRatio).toBeLessThan(MAX_ACCEPTABLE_RATIO);
    });
  });
});