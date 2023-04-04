import { bigIntToBytes } from '../crypto/bigint-helpers.js';
import { createProvable } from './provable-generic.js';
import { GenericHashInput, GenericProvableExtended } from './generic.js';
import { BinableWithBits, defineBinable, withBits } from './binable.js';

export { provable, ProvableExtended, ProvableBigint, BinableBigint, HashInput };

type Field = bigint;

let provable = createProvable<Field>();

type ProvableExtended<T, J> = GenericProvableExtended<T, J, Field>;
type HashInput = GenericHashInput<Field>;

function ProvableBigint<
  T extends bigint = bigint,
  TJSON extends string = string
>(check: (x: bigint) => void): ProvableExtended<T, TJSON> {
  return {
    sizeInFields() {
      return 1;
    },
    toFields(x): Field[] {
      return [x];
    },
    toAuxiliary() {
      return [];
    },
    check,
    fromFields([x]) {
      check(x);
      return x as T;
    },
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
