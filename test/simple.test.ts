import { main } from '../src/examples/schnorr_sign';
import { shutdown, snarkyReady } from '../src/snarky';

const timeout = (ms: number) => {
  return new Promise((resolve, _) => {
    let wait = setTimeout(() => {
      clearTimeout(wait);
      resolve('');
    }, ms);
  });
};

describe('snarkyjs', () => {
  afterAll(() => {
    shutdown();
  });
  it('schnoorr_sign.main() is successfully called', async () => {
    // await timeout(1000);
    await snarkyReady;
    main();
    expect(true);
  });
});
