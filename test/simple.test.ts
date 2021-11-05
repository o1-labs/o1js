import { main } from '../src/examples/schnorr_sign';
import { shutdown } from '../src/snarky';
import { Update } from '../src/lib/party';

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
    await timeout(1000);
    main();
    expect(true);
  });
});
