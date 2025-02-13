import { Bytes } from '../wrapped-classes.js';
import { describe, test } from 'node:test';
import { expect } from 'expect';

function calculateB64DecodedBytesLength(base64String: string): number {
  // Calculate the length of the base64-encoded string
  const base64Length = base64String.length;

  // Count the number of padding characters '=' in the base64 string
  const padding = (base64String.match(/=/g) || []).length;

  // Calculate the length of the decoded bytes
  const byteLength = (base64Length * 3) / 4 - padding;

  return byteLength;
}

function generateRandomString(maxLength: number, encoding?: BufferEncoding): string {
  // Generate a random length between 1 and maxLength
  const randomLength = Math.floor(Math.random() * maxLength) + 1;

  // Generate random bytes
  const randomBytes = Bytes(randomLength).random().toBytes();

  // Convert to string given the chosen encoding
  const randomString = Buffer.from(randomBytes).toString(encoding);

  return randomString;
}

describe('Base64 Decode Tests', () => {
  function testBase64Decode(base64String: string) {
    // Calculate the expected length of the decoded bytes
    const decodedByteLength = calculateB64DecodedBytesLength(base64String);

    // Decode the base64 string
    const decodedBytes = Bytes.fromString(base64String).base64Decode(decodedByteLength).toBytes();

    // Calculate the expected decoded bytes using JS implementation
    const decodedString = atob(base64String);
    let expectedDecodedBytes = new Uint8Array(decodedString.length);

    // Populate the expected decoded bytes array with character codes
    for (let i = 0; i < decodedString.length; i++) {
      expectedDecodedBytes[i] = decodedString.charCodeAt(i);
    }

    expect(decodedBytes).toEqual(expectedDecodedBytes);
  }

  test('should decode a base64-encoded input', async () => {
    const input = '7xQMDuoVVU4m0W0WRVSrVXMeGSIASsnucK9dJsrc+vU=';
    testBase64Decode(input);
  });

  test('should decode a base64-encoded input (1000 iterations)', async () => {
    for (let i = 0; i < 1000; i++) {
      const randomBase64String = generateRandomString(100, 'base64');
      testBase64Decode(randomBase64String);
    }
  });

  test('should reject a base64-encoded input of length not a multiple of 4', async () => {
    const input = 'ad/';
    const errorMessage = 'Input base64 byte length should be a multiple of 4!';
    expect(() => testBase64Decode(input)).toThrowError(errorMessage);
  });

  test('should reject input containing non-base64 characters', async () => {
    const input = 'ad$=';
    const errorMessage =
      'Please provide Base64-encoded bytes containing only alphanumeric characters and +/=';
    expect(() => testBase64Decode(input)).toThrowError(errorMessage);
  });
});

describe('Base64 Encode Tests', () => {
  function testBase64Encode(input: string) {
    const inputBytes = Bytes.fromString(input);

    // Base64 Encode the input bytes
    const encodedBytes = inputBytes.base64Encode();

    // Calculate the expected encoded bytes using JS implementation
    const expectedEncodedBytes = Bytes.from(Buffer.from(btoa(input)));

    expect(encodedBytes).toEqual(expectedEncodedBytes);
  }

  test('should Base64 encode an input', async () => {
    const input = 'ef140c0eea15554e26d16d164554ab55731e1922004ac9ee70af5d26cadcfaf5';
    testBase64Encode(input);
  });

  test('should Base64 encode different inputs (1000 iterations)', async () => {
    for (let i = 0; i < 1000; i++) {
      const input = generateRandomString(100, 'base64');
      testBase64Encode(input);
    }
  });
});
