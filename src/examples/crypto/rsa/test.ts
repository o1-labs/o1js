import { Bigint2048, rsaVerify65537 } from './rsa.js';
import {
  sha256Bigint,
  generateRsaParams,
  rsaSign,
  randomPrime,
} from './utils.js';
import { expect } from 'expect';
import { it, describe } from 'node:test';

describe('RSA65537 verification tests', () => {
  it('should accept a simple RSA signature', () => {
    const message = Bigint2048.from(4n);
    const rsaSig = Bigint2048.from(31n);
    const modul = Bigint2048.from(33n);

    rsaVerify65537(message, rsaSig, modul);
  });

  // Params imported from https://github.com/rzcoder/node-rsa#:~:text=key.importKey(%7B,%2C%20%27components%27)%3B
  it('should accept RSA signature with hardcoded valid parameters', () => {
    const params = {
      n: 0x0086fa9ba066685845fc03833a9699c8baefb53cfbf19052a7f10f1eaa30488cec1ceb752bdff2df9fad6c64b3498956e7dbab4035b4823c99a44cc57088a23783n,
      e: 65537n,
      d: 0x5d2f0dd982596ef781affb1cab73a77c46985c6da2aafc252cea3f4546e80f40c0e247d7d9467750ea1321cc5aa638871b3ed96d19dcc124916b0bcb296f35e1n,
      p: 0x00c59419db615e56b9805cc45673a32d278917534804171edcf925ab1df203927fn,
      q: 0x00aee3f86b66087abc069b8b1736e38ad6af624f7ea80e70b95f4ff2bf77cd90fdn,
      dmp1: 0x008112f5a969fcb56f4e3a4c51a60dcdebec157ee4a7376b843487b53844e8ac85n,
      dmq1: 0x1a7370470e0f8a4095df40922a430fe498720e03e1f70d257c3ce34202249d21n,
      coeff:
        0x00b399675e5e81506b729a777cc03026f0b2119853dfc5eb124610c0ab82999e45n,
    };

    const message = Bigint2048.from(13n);
    const rsaSig = Bigint2048.from(rsaSign(13n, params.d, params.n));
    const modul = Bigint2048.from(params.n);

    rsaVerify65537(message, rsaSig, modul);
  });

  it('should accept RSA signature with randomly generated parameters: 512-bits (20 iterations)', async () => {
    const input = await sha256Bigint('hello there!');

    for (let i = 0; i < 20; i++) {
      const params = generateRsaParams(512);

      const message = Bigint2048.from(input);
      const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
      const modulus = Bigint2048.from(params.n);

      rsaVerify65537(message, signature, modulus);
    }
  });

  it('should accept RSA signature with randomly generated parameters: 1024-bits (10 iterations)', async () => {
    const input = await sha256Bigint('how is it going!');

    for (let i = 0; i < 10; i++) {
      const params = generateRsaParams(1024);

      const message = Bigint2048.from(input);
      const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
      const modulus = Bigint2048.from(params.n); // domain public key

      rsaVerify65537(message, signature, modulus);
    }
  });

  it('should accept RSA signature with randomly generated parameters: 2048-bits (5 iterations)', async () => {
    const input = await sha256Bigint('how are you!');

    for (let i = 0; i < 5; i++) {
      const params = generateRsaParams(2048);

      const message = Bigint2048.from(input);
      const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
      const modulus = Bigint2048.from(params.n);

      rsaVerify65537(message, signature, modulus);
    }
  });

  it('should reject RSA signature with randomly generated parameters larger than 2048 bits', async () => {
    const input = await sha256Bigint('how are you!');
    const params = generateRsaParams(2560);

    const message = Bigint2048.from(input);
    const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
    const modulus = Bigint2048.from(params.n);

    expect(() => rsaVerify65537(message, signature, modulus)).toThrowError();
  });

  it('should reject RSA signature with non-compliant modulus: 2048 bits', async () => {
    const input = await sha256Bigint('hello!');
    const params = generateRsaParams(2048);

    const message = Bigint2048.from(input);
    const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
    const modulus = Bigint2048.from(randomPrime(2048)); // Tamper with modulus

    expect(() => rsaVerify65537(message, signature, modulus)).toThrowError();
  });

  it('should reject RSA signature with non-compliant input: 2048 bits', async () => {
    const input = await sha256Bigint('hello!');
    const params = generateRsaParams(2048);

    const message = Bigint2048.from(35n); // Tamper with input
    const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
    const modulus = Bigint2048.from(params.n);

    expect(() => rsaVerify65537(message, signature, modulus)).toThrowError();
  });

  it('should reject non compliant RSA signature: false private key: 2048 bits', async () => {
    const input = await sha256Bigint('hello!');
    const params = generateRsaParams(2048);

    const message = Bigint2048.from(input);
    const signature = Bigint2048.from(rsaSign(input, params.e, params.n)); // Tamper with private key
    const modulus = Bigint2048.from(params.n);

    expect(() => rsaVerify65537(message, signature, modulus)).toThrowError();
  });

  it('should reject non-compliant RSA signature: false signature modulus : 2048 bits', async () => {
    const input = await sha256Bigint('hello!');
    const params = generateRsaParams(2048);

    const message = Bigint2048.from(input);
    const signature = Bigint2048.from(rsaSign(input, params.d, 1223n)); // Tamper with signature modulus
    const modulus = Bigint2048.from(params.n);

    expect(() => rsaVerify65537(message, signature, modulus)).toThrowError();
  });
});
