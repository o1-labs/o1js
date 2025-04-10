import type {
  WasmFpGate,
  WasmFpPolyComm,
  WasmFqGate,
  WasmFqPolyComm,
  WasmGPallas,
  WasmGVesta,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import { OrInfinity, Gate, PolyComm, Wire } from './kimchi-types.js';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { MlArray } from '../../../lib/ml/base.js';
import { mapTuple } from './util.js';
import {
  WasmAffine,
  affineFromRust,
  affineToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from './conversion-base.js';

export {
  ConversionCore,
  ConversionCores,
  conversionCore,
  freeOnFinalize,
  wrap,
  unwrap,
  mapFromUintArray,
  mapToUint32Array,
};

// basic conversion functions for each field

type wasm = typeof wasmNamespace;

type WasmPolyComm = WasmFpPolyComm | WasmFqPolyComm;

type WasmClasses = {
  CommitmentCurve: typeof WasmGVesta | typeof WasmGPallas;
  makeAffine: () => WasmAffine;
  Gate: typeof WasmFpGate | typeof WasmFqGate;
  PolyComm: typeof WasmFpPolyComm | typeof WasmFqPolyComm;
};

type ConversionCore = ReturnType<typeof conversionCorePerField>;
type ConversionCores = ReturnType<typeof conversionCore>;

function conversionCore(wasm: wasm) {
  const fp = conversionCorePerField(wasm, {
    CommitmentCurve: wasm.WasmGVesta,
    makeAffine: wasm.caml_vesta_affine_one,
    Gate: wasm.WasmFpGate,
    PolyComm: wasm.WasmFpPolyComm,
  });
  const fq = conversionCorePerField(wasm, {
    CommitmentCurve: wasm.WasmGPallas,
    makeAffine: wasm.caml_pallas_affine_one,
    Gate: wasm.WasmFqGate,
    PolyComm: wasm.WasmFqPolyComm,
  });

  return {
    fp,
    fq,
    wireToRust: fp.wireToRust, // doesn't depend on the field
    mapMlArrayToRustVector<TMl, TRust extends {}>(
      [, ...array]: MlArray<TMl>,
      map: (x: TMl) => TRust
    ): Uint32Array {
      return mapToUint32Array(array, (x) => unwrap(map(x)));
    },
  };
}

function conversionCorePerField(
  wasm: wasm,
  { CommitmentCurve, makeAffine, Gate, PolyComm }: WasmClasses
) {
  let self = {
    wireToRust([, row, col]: Wire) {
      return wasm.Wire.create(row, col);
    },

    vectorToRust: fieldsToRustFlat,
    vectorFromRust: fieldsFromRustFlat,

    gateToRust(gate: Gate) {
      let [, typ, [, ...wires], coeffs] = gate;
      let rustWires = new wasm.WasmGateWires(
        ...mapTuple(wires, self.wireToRust)
      );
      let rustCoeffs = fieldsToRustFlat(coeffs);
      return new Gate(typ, rustWires, rustCoeffs);
    },
    gateFromRust(wasmGate: WasmFpGate | WasmFqGate) {
      // note: this was never used and the old implementation was wrong
      // (accessed non-existent fields on wasmGate)
      throw Error('gateFromRust not implemented');
    },

    pointToRust(point: OrInfinity) {
      return affineToRust(point, makeAffine);
    },
    pointFromRust: affineFromRust,

    pointsToRust([, ...points]: MlArray<OrInfinity>): Uint32Array {
      return mapToUint32Array(points, (point) =>
        unwrap(self.pointToRust(point))
      );
    },
    pointsFromRust(points: Uint32Array): MlArray<OrInfinity> {
      let arr = mapFromUintArray(points, (ptr) =>
        affineFromRust(wrap(ptr, CommitmentCurve))
      );
      return [0, ...arr];
    },

    polyCommToRust(polyComm: PolyComm): WasmPolyComm {
      let [, camlElems] = polyComm;
      let rustShifted = undefined;
      let rustUnshifted = self.pointsToRust(camlElems);
      return new PolyComm(rustUnshifted, rustShifted);
    },
    polyCommFromRust(polyComm: WasmPolyComm): PolyComm {
      let rustUnshifted = polyComm.unshifted;
      let mlUnshifted = mapFromUintArray(rustUnshifted, (ptr) => {
        return affineFromRust(wrap(ptr, CommitmentCurve));
      });
      return [0, [0, ...mlUnshifted]];
    },

    polyCommsToRust([, ...comms]: MlArray<PolyComm>): Uint32Array {
      return mapToUint32Array(comms, (c) => unwrap(self.polyCommToRust(c)));
    },
    polyCommsFromRust(rustComms: Uint32Array): MlArray<PolyComm> {
      let comms = mapFromUintArray(rustComms, (ptr) =>
        self.polyCommFromRust(wrap(ptr, PolyComm))
      );
      return [0, ...comms];
    },
  };

  return self;
}

// generic rust helpers

type Freeable = { free(): void };
type Constructor<T> = new (...args: any[]) => T;

function wrap<T>(ptr: number, Class: Constructor<T>): T {
  const obj = Object.create(Class.prototype);
  obj.__wbg_ptr = ptr;
  return obj;
}
function unwrap<T extends {}>(obj: T): number {
  // Beware: caller may need to do finalizer things to avoid these
  // pointers disappearing out from under us.
  let ptr = (obj as any).__wbg_ptr;
  if (ptr === undefined) throw Error('unwrap: missing ptr');
  return ptr;
}

const registry = new FinalizationRegistry((ptr: Freeable) => {
  ptr.free();
});
function freeOnFinalize<T extends Freeable>(instance: T) {
  // This is an unfortunate hack: we're creating a second instance of the
  // class to be able to call free on it. We can't pass the value itself,
  // since the registry holds a strong reference to the representative value.
  //
  // However, the class is only really a wrapper around a pointer, with a
  // reference to the class' prototype as its __prototype__.
  //
  // It might seem cleaner to call the destructor here on the pointer
  // directly, but unfortunately the destructor name is some mangled internal
  // string generated by wasm_bindgen. For now, this is the best,
  // least-brittle way to free once the original class instance gets collected.
  let instanceRepresentative = wrap<T>(
    (instance as any).__wbg_ptr,
    (instance as any).constructor
  );
  registry.register(instance, instanceRepresentative, instance);
  return instance;
}

function mapFromUintArray<T>(
  array: Uint32Array | Uint8Array,
  map: (i: number) => T
) {
  let n = array.length;
  let result: T[] = Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = map(array[i]);
  }
  return result;
}

function mapToUint32Array<T>(array: T[], map: (t: T) => number) {
  let n = array.length;
  let result = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = map(array[i]);
  }
  return result;
}
