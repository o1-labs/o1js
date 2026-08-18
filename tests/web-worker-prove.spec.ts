import { expect, test } from '@playwright/test';

declare global {
  var __o1jsWorkerProveRegression: any;
}

test('proves twice with a warm synchronous cache across browser finalization', async ({ page }) => {
  await page.route('**/web-worker-prove.html', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>o1js web worker prove regression</title>',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    });
  });
  await page.goto('/web-worker-prove.html');

  let setup = await page.evaluate(async () => {
    let modulePath = '/index.js';
    let o1js = await import(modulePath);
    o1js.setNumberOfWorkers(1);

    let Program = o1js.ZkProgram({
      name: 'web-worker-finalization-regression',
      publicOutput: o1js.Field,
      methods: {
        baseCase: {
          privateInputs: [],
          async method() {
            return { publicOutput: o1js.Field(1) };
          },
        },
      },
    });

    let entries = new Map();
    let cacheStats = { reads: 0, hits: 0, writes: 0 };
    let cache = {
      canWrite: true,
      read(header: any) {
        cacheStats.reads++;
        let entry = entries.get(header.persistentId);
        if (entry?.uniqueId !== header.uniqueId) return undefined;
        cacheStats.hits++;
        return entry.data.slice();
      },
      write(header: any, data: Uint8Array) {
        cacheStats.writes++;
        entries.set(header.persistentId, {
          uniqueId: header.uniqueId,
          data: data.slice(),
        });
      },
    };

    await Program.compile({ cache });
    let { verificationKey } = await Program.compile({ cache });
    let first: any = await Program.baseCase();
    first = undefined;

    let state = {
      Program,
      verificationKey,
      verify: o1js.verify,
      finalized: false,
      finalizationRegistry: undefined as FinalizationRegistry<object> | undefined,
    };
    state.finalizationRegistry = new FinalizationRegistry(() => {
      state.finalized = true;
    });
    let sentinel: object | undefined = {};
    state.finalizationRegistry.register(sentinel, 'checkpoint');
    sentinel = undefined;
    globalThis.__o1jsWorkerProveRegression = state;

    return {
      cacheStats,
      crossOriginIsolated,
      finalizationRegistry: typeof FinalizationRegistry,
    };
  });

  expect(setup.crossOriginIsolated).toBe(true);
  expect(setup.finalizationRegistry).toBe('function');
  expect(setup.cacheStats.writes).toBeGreaterThan(0);
  expect(setup.cacheStats.hits).toBeGreaterThan(0);

  await expect
    .poll(
      async () => {
        await page.requestGC();
        return page.evaluate(() => globalThis.__o1jsWorkerProveRegression.finalized);
      },
      { timeout: 30_000 }
    )
    .toBe(true);

  let verified = await page.evaluate(async () => {
    let { Program, verificationKey, verify } = globalThis.__o1jsWorkerProveRegression;
    let second = await Program.baseCase();
    return verify(second.proof, verificationKey);
  });
  expect(verified).toBe(true);
});
