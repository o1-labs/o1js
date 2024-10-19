import { Cache, LAGRANGE_BASIS_PREFIX } from './cache.js';
import { SelfProof, ZkProgram } from './zkprogram.js';
import { Field } from '../provable/field.js';
import { it, describe, after, before } from 'node:test';
import { expect } from 'expect';
import { promises as fs } from 'fs';

const __cacheDirname = './.tmpcache';

const exampleProgram = ZkProgram({
  name: 'example',
  publicOutput: Field,
  methods: {
    init: {
      privateInputs: [],
      async method() {
        return new Field(0);
      },
    },
    run: {
      privateInputs: [SelfProof],
      async method(p: SelfProof<undefined, Field>) {
        return p.publicOutput.add(new Field(1));
      },
    },
  },
});

describe('Compiling a program with a cache', () => {
  const cache: Cache & { lagrangeBasisReadCount?: number } =
    Cache.FileSystem(__cacheDirname);
  const originalRead = cache.read;
  cache.lagrangeBasisReadCount = 0;
  cache.read = ({ persistentId, uniqueId, dataType }) => {
    if (persistentId.startsWith(LAGRANGE_BASIS_PREFIX)) {
      const readCount = cache.lagrangeBasisReadCount || 0;
      cache.lagrangeBasisReadCount = readCount + 1;
    }
    return originalRead({ persistentId, uniqueId, dataType } as any);
  };

  before(async () => {
    await fs.mkdir(__cacheDirname, { recursive: true });
  });

  after(async () => {
    await fs.rm(__cacheDirname, { recursive: true });
  });

  it('should attempt to read lagrange basis from the cache during compile', async () => {
    cache.lagrangeBasisReadCount = 0;
    await exampleProgram.compile({ cache });
    expect(cache.lagrangeBasisReadCount).not.toBe(0);
    cache.lagrangeBasisReadCount = 0;
  });
});
