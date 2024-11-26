import { bigIntToBytes } from '../../bindings/crypto/bigint-helpers.js';
import { createDerivers } from '../../bindings/lib/provable-generic.js';
import {
  GenericHashInput,
  GenericSignable,
} from '../../bindings/lib/generic.js';
import {
  BinableWithBits,
  defineBinable,
  withBits,
} from '../../bindings/lib/binable.js';

export {
  signable,
  SignableBigint,
  BinableBigint,
  BinableBool,
  HashInput,
  Signable,
};

type Field = bigint;

let { signable } = createDerivers<Field>();

type Signable<T, J> = GenericSignable<T, J, Field>;
type HashInput = GenericHashInput<Field>;

function SignableBigint<
  T extends bigint = bigint,
  TJSON extends string = string
>(check: (x: bigint) => void): Signable<T, TJSON> {
  return {
    toInput(x) {
      return { fields: [x], packed: [] };
    },
    toJSON(x) {
      return x.toString() as TJSON;
    },
    fromJSON(json) {
      if (isNaN(json as any) || isNaN(parseFloat(json))) {
        throw Error(`fromJSON: expected a numeric string, got "${json}"`);
      }
      let x = BigInt(json) as T;
      check(x);
      return x;
    },
    empty() {
      return 0n as T;
    },
  };
}

function BinableBigint<T extends bigint = bigint>(
  sizeInBits: number,
  check: (x: bigint) => void
): BinableWithBits<T> {
  let sizeInBytes = Math.ceil(sizeInBits / 8);
  return withBits(
    defineBinable({
      toBytes(x) {
        return bigIntToBytes(x, sizeInBytes);
      },
      readBytes(bytes, start) {
        let x = 0n;
        let bitPosition = 0n;
        let end = Math.min(start + sizeInBytes, bytes.length);
        for (let i = start; i < end; i++) {
          x += BigInt(bytes[i]) << bitPosition;
          bitPosition += 8n;
        }
        check(x);
        return [x as T, end];
      },
    }),
    sizeInBits
  );
}

function BinableBool(check: (x: number) => void): BinableWithBits<boolean> {
  return withBits(
    defineBinable({
      toBytes(x) {
        return [x ? 1 : 0];
      },
      readBytes(bytes, start) {
        let byte = bytes[start];
        check(byte);
        return [byte === 1, start + 1];
      },
    }),
    1
  );
}
