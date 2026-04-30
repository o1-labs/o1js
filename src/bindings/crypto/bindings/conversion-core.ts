import { MlArray } from '../../../lib/ml/base.js';
import type * as wasmNamespace from '../../compiled/node_bindings/kimchi_wasm.cjs';
import type {
  WasmFpGate,
  WasmFpPolyComm,
  WasmFqGate,
  WasmFqPolyComm,
  WasmGPallas,
  WasmGVesta,
} from '../../compiled/node_bindings/kimchi_wasm.cjs';
import {
  WasmAffine,
  affineFromRust,
  affineToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from './conversion-base.js';
import { Gate, OrInfinity, PolyComm, Wire } from './kimchi-types.js';
import { mapTuple } from './util.js';

export {
  ConversionCore,
  ConversionCores,
  conversionCore,
  freeOnFinalize,
  intoRaw,
  mapFromUintArray,
  mapToUint32Array,
  unwrap,
  wrap,
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
      // Transfer ownership to Rust when the wasm-bindgen wrapper supports it.
      return mapToUint32Array(array, (x) => intoRaw(map(x)));
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
      let rustWires = new wasm.WasmGateWires(...mapTuple(wires, self.wireToRust));
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
      return mapToUint32Array(points, (point) => intoRaw(self.pointToRust(point)));
    },
    pointsFromRust(points: Uint32Array): MlArray<OrInfinity> {
      let arr = mapFromUintArray(points, (ptr) => affineFromRust(wrap(ptr, CommitmentCurve)));
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
      // Real wasm-bindgen wrappers own resources and should be released now.
      // Synthetic wrappers created by `wrap()` only borrow raw pointers and
      // must not call free().
      if (!(polyComm as any).__o1js_wrapped_ptr && typeof (polyComm as any).free === 'function') {
        (polyComm as any).free();
      }
      return [0, [0, ...mlUnshifted]];
    },

    polyCommsToRust([, ...comms]: MlArray<PolyComm>): Uint32Array {
      return mapToUint32Array(comms, (c) => intoRaw(self.polyCommToRust(c)));
    },
    polyCommsFromRust(rustComms: Uint32Array): MlArray<PolyComm> {
      let comms = mapFromUintArray(rustComms, (ptr) => self.polyCommFromRust(wrap(ptr, PolyComm)));
      return [0, ...comms];
    },
  };

  return self;
}

// generic rust helpers

type Freeable = { free(): void };
type Constructor<T extends object> = { prototype: T };

function wrap<T extends object>(ptr: number, Class: Constructor<T>): T {
  const obj = Object.create(Class.prototype);
  obj.__wbg_ptr = ptr;
  obj.__o1js_wrapped_ptr = true;
  return obj;
}
function unwrap<T extends {}>(obj: T): number {
  // Beware: caller may need to do finalizer things to avoid these
  // pointers disappearing out from under us.
  let ptr = (obj as any).__wbg_ptr;
  if (ptr === undefined) throw Error('unwrap: missing ptr');
  return ptr;
}

// Return a pointer suitable for passing to Rust FFI.
// - wasm-bindgen wrappers: call `__destroy_into_raw()` to transfer ownership
//   to Rust and detach JS-side finalization.
// - plain pointer wrappers (no destroy hook): fall back to `unwrap()`.
// This prevents JS and Rust from both believing they own the same allocation.
function intoRaw<T extends {}>(obj: T): number {
  let destroyIntoRaw = (obj as any)?.__destroy_into_raw;
  if (typeof destroyIntoRaw === 'function') return destroyIntoRaw.call(obj);
  return unwrap(obj);
}

const registry = new FinalizationRegistry((ptr: Freeable) => {
  ptr.free();
});
function freeOnFinalize<T extends Freeable>(instance: T) {
  // wasm-bindgen wrappers already manage finalization/ownership internally.
  // Adding another free path here can double-free or free borrowed values.
  if (typeof (instance as any)?.__destroy_into_raw === 'function') {
    return instance;
  }
  // We want `instance` to be garbage-collected naturally, but still release
  // its Rust allocation when that happens.
  //
  // FinalizationRegistry cannot hold `instance` itself as the representative
  // value, because that would keep it alive. Instead we create a tiny stand-in
  // that only carries the prototype + raw pointer, which is enough to call
  // `.free()` once `instance` is collected.
  //
  // We intentionally avoid `__wrap()` here, because that constructor path is
  // for normal wasm-bindgen object creation and can interact with ownership
  // bookkeeping we do not want in this finalizer surrogate.
  let instanceRepresentative = Object.create((instance as any).constructor.prototype);
  (instanceRepresentative as any).__wbg_ptr = (instance as any).__wbg_ptr;
  registry.register(instance, instanceRepresentative, instance);
  return instance;
}

function mapFromUintArray<T>(array: Uint32Array | Uint8Array, map: (i: number) => T) {
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
