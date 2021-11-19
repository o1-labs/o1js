import { shutdown, snarkyReady } from '../dist/server';
import { main } from './schnorr_sign';

describe('snarkyjs', () => {
  afterAll(() => {
    shutdown();
  });
  it('schnorr_sign.main() is successfully called', async () => {
    await snarkyReady;
    main();
    expect(true);
  });
});
