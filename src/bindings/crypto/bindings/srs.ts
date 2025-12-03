import { MlArray } from '../../../lib/ml/base.js';
import {
  readCache,
  withVersion,
  writeCache,
  type Cache,
  type CacheHeader,
} from '../../../lib/proof-system/cache.js';
import { assert } from '../../../lib/util/errors.js';
import { type WasmFpSrs, type WasmFqSrs } from '../../compiled/node_bindings/plonk_wasm.cjs';
import type { RustConversion, Wasm } from '../bindings.js';
import { OrInfinity, OrInfinityJson } from './curve.js';
import { PolyComm } from './kimchi-types.js';

export { setSrsCache, srs, unsetSrsCache };

type WasmSrs = WasmFpSrs | WasmFqSrs;

type SrsStore = Record<number, WasmSrs>;

function empty(): SrsStore {
  return {};
}

const srsStore = { fp: empty(), fq: empty() };

const CacheReadRegister = new Map<string, boolean>();

let cache: Cache | undefined;

function setSrsCache(c: Cache) {
  cache = c;
}
function unsetSrsCache() {
  cache = undefined;
}

const srsVersion = 1;

function cacheHeaderLagrange(f: 'fp' | 'fq', domainSize: number): CacheHeader {
  let id = `lagrange-basis-${f}-${domainSize}`;
  return withVersion(
    {
      kind: 'lagrange-basis',
      persistentId: id,
      uniqueId: id,
      dataType: 'string',
    },
    srsVersion
  );
}
function cacheHeaderSrs(f: 'fp' | 'fq', domainSize: number): CacheHeader {
  let id = `srs-${f}-${domainSize}`;
  return withVersion(
    {
      kind: 'srs',
      persistentId: id,
      uniqueId: id,
      dataType: 'string',
    },
    srsVersion
  );
}

function srs(wasm: Wasm, conversion: RustConversion) {
  return {
    fp: srsPerField('fp', wasm, conversion),
    fq: srsPerField('fq', wasm, conversion),
  };
}

function srsPerField(f: 'fp' | 'fq', wasm: Wasm, conversion: RustConversion) {
  // note: these functions are properly typed, thanks to TS template literal types
  let createSrs = (size: number) => {
    try {
      console.log(0);
      return wasm[`caml_${f}_srs_create_parallel`](size);
    } catch (error) {
      console.error(`Error in SRS get for field ${f}`);
      throw error;
    }
  };
  let getSrs = (srs: WasmSrs) => {
    try {
      console.log(1);
      let v = wasm[`caml_${f}_srs_get`](srs);
      console.log(2);
      return v;
    } catch (error) {
      console.error(`Error in SRS get for field ${f}`);
      throw error;
    }
  };
  let setSrs = (bytes: any) => {
    try {
      console.log(2);
      return wasm[`caml_${f}_srs_set`](bytes);
    } catch (error) {
      console.error(`Error in SRS set for field ${f} args ${bytes}`);
      throw error;
    }
  };

  let maybeLagrangeCommitment = (srs: WasmSrs, domain_size: number, i: number) => {
    try {
      console.log(3);
      console.log('srs wasm', srs);
      let bytes = (wasm as any)[`caml_${f}_srs_to_bytes_external`](srs);
      console.log('bytes', bytes);
      let wasmSrs = undefined;
      if (f === 'fp') wasmSrs = wasm.WasmFpSrs.deserialize(bytes);
      else wasmSrs = wasm.WasmFqSrs.deserialize(bytes);
      let s = wasm[`caml_${f}_srs_maybe_lagrange_commitment`](wasmSrs, domain_size, i);
      console.log('S', s);
      return s;
    } catch (error) {
      console.error(`Error in SRS maybe lagrange commitment for field ${f}`);
      throw error;
    }
  };
  let lagrangeCommitment = (srs: WasmSrs, domain_size: number, i: number) => {
    try {
      console.log(4);
      console.log('srs', srs);
      let bytes = (wasm as any)[`caml_${f}_srs_to_bytes_external`](srs);
      console.log('bytes', bytes);
      let wasmSrs = undefined;
      if (f === 'fp') wasmSrs = wasm.WasmFpSrs.deserialize(bytes);
      else wasmSrs = wasm.WasmFqSrs.deserialize(bytes);
      return wasm[`caml_${f}_srs_lagrange_commitment`](wasmSrs, domain_size, i);
    } catch (error) {
      console.error(`Error in SRS lagrange commitment for field ${f}`);
      throw error;
    }
  };
  let lagrangeCommitmentsWholeDomainPtr = (srs: WasmSrs, domain_size: number) => {
    try {
      console.log(5);
      console.log('srs', srs);
      let bytes = (wasm as any)[`caml_${f}_srs_to_bytes_external`](srs);
      console.log('bytes', bytes);
      let wasmSrs = undefined;
      if (f === 'fp') wasmSrs = wasm.WasmFpSrs.deserialize(bytes);
      else wasmSrs = wasm.WasmFqSrs.deserialize(bytes);
      return wasm[`caml_${f}_srs_lagrange_commitments_whole_domain_ptr`](wasmSrs, domain_size);
    } catch (error) {
      console.error(`Error in SRS lagrange commitments whole domain ptr for field ${f}`);
      throw error;
    }
  };
  let setLagrangeBasis = (srs: WasmSrs, domain_size: number, input: any) => {
    try {
      console.log(6);
      return wasm[`caml_${f}_srs_set_lagrange_basis`](srs, domain_size, input);
    } catch (error) {
      console.error(`Error in SRS set lagrange basis for field ${f}`);
      throw error;
    }
  };
  let getLagrangeBasis = (srs: WasmSrs, n: number) => {
    try {
      console.log(7);
      console.log('srs', srs);
      let bytes = (wasm as any)[`caml_${f}_srs_to_bytes_external`](srs);
      console.log('bytes', bytes);
      let wasmSrs = undefined;
      if (f === 'fp') wasmSrs = wasm.WasmFpSrs.deserialize(bytes);
      else wasmSrs = wasm.WasmFqSrs.deserialize(bytes);
      return wasm[`caml_${f}_srs_get_lagrange_basis`](wasmSrs, n);
    } catch (error) {
      console.error(`Error in SRS get lagrange basis for field ${f}`);
      throw error;
    }
  };
  let getCommitmentsWholeDomainByPtr = (ptr: number) => {
    try {
      console.log(8);
      return wasm[`caml_${f}_srs_lagrange_commitments_whole_domain_read_from_ptr`](ptr);
    } catch (error) {
      console.error(`Error in SRS get commitments whole domain by ptr for field ${f}`);
      throw error;
    }
  };

  return {
    /**
     * returns existing stored SRS or falls back to creating a new one
     */
    create(size: number): WasmSrs {
      let srs = srsStore[f][size] satisfies WasmSrs as WasmSrs | undefined;

      if (srs === undefined) {
        if (cache === undefined) {
          // if there is no cache, create SRS in memory
          console.log('Creating SRS without cache');
          srs = createSrs(size);
          console.log('SRS created without cache:', srs);
        } else {
          let header = cacheHeaderSrs(f, size);

          // try to read SRS from cache / recompute and write if not found
          console.log('Reading SRS from cache');
          srs = readCache(cache, header, (bytes) => {
            // TODO: this takes a bit too long, about 300ms for 2^16
            // `pointsToRust` is the clear bottleneck
            let jsonSrs: OrInfinityJson[] = JSON.parse(new TextDecoder().decode(bytes));
            let mlSrs = MlArray.mapTo(jsonSrs, OrInfinity.fromJSON);
            let wasmSrs = conversion[f].pointsToRust(mlSrs);
            return setSrs(wasmSrs);
          });
          console.log('SRS read from cache:', srs);
          if (srs === undefined) {
            // not in cache
            console.log(1);
            srs = createSrs(size);
            console.log('Writing SRS to cache', srs);

            if (cache.canWrite) {
              console.log(2);
              let wasmSrs = getSrs(srs);
              console.log(3);
              let mlSrs = conversion[f].pointsFromRust(wasmSrs);
              let jsonSrs = MlArray.mapFrom(mlSrs, OrInfinity.toJSON);
              let bytes = new TextEncoder().encode(JSON.stringify(jsonSrs));

              writeCache(cache, header, bytes);
            }
          }
        }
        console.log('Storing SRS in memory');
        srsStore[f][size] = srs;
        console.log('SRS stored in memory:', srs);
      }

      // TODO should we call freeOnFinalize() and expose a function to clean the SRS cache?
      console.trace('Returning SRS:', srs);
      return srsStore[f][size];
    },

    /**
     * returns ith Lagrange basis commitment for a given domain size
     */
    lagrangeCommitment(srs: WasmSrs, domainSize: number, i: number): PolyComm {
      console.log('lagrangeCommitment');
      // happy, fast case: if basis is already stored on the srs, return the ith commitment
      let commitment = maybeLagrangeCommitment(srs, domainSize, i);

      if (commitment === undefined) {
        if (cache === undefined) {
          // if there is no cache, recompute and store basis in memory
          commitment = lagrangeCommitment(srs, domainSize, i);
        } else {
          // try to read lagrange basis from cache / recompute and write if not found
          let header = cacheHeaderLagrange(f, domainSize);
          let didRead = readCacheLazy(
            cache,
            header,
            conversion,
            f,
            srs,
            domainSize,
            setLagrangeBasis
          );
          if (didRead !== true) {
            // not in cache
            if (cache.canWrite) {
              // TODO: this code path will throw on the web since `caml_${f}_srs_get_lagrange_basis` is not properly implemented
              // using a writable cache in the browser seems to be fairly uncommon though, so it's at least an 80/20 solution
              let wasmComms = getLagrangeBasis(srs, domainSize);
              console.log('wasmComms', wasmComms);
              let mlComms = conversion[f].polyCommsFromRust(wasmComms);
              console.log('mlComms', mlComms);
              let comms = polyCommsToJSON(mlComms);
              let bytes = new TextEncoder().encode(JSON.stringify(comms));
              writeCache(cache, header, bytes);
            } else {
              lagrangeCommitment(srs, domainSize, i);
            }
          }
          // here, basis is definitely stored on the srs
          let c = maybeLagrangeCommitment(srs, domainSize, i);
          assert(c !== undefined, 'commitment exists after setting');
          commitment = c;
        }
      }

      // edge case for when we have a writeable cache and the basis was already stored on the srs
      // but we didn't store it in the cache separately yet
      if (commitment && cache && cache.canWrite) {
        let header = cacheHeaderLagrange(f, domainSize);
        let didRead = readCacheLazy(
          cache,
          header,
          conversion,
          f,
          srs,
          domainSize,
          setLagrangeBasis
        );
        // only proceed for entries we haven't written to the cache yet
        if (didRead !== true) {
          // same code as above - write the lagrange basis to the cache if it wasn't there already
          // currently we re-generate the basis via `getLagrangeBasis` - we could derive this from the
          // already existing `commitment` instead, but this is simpler and the performance impact is negligible
          let wasmComms = getLagrangeBasis(srs, domainSize);
          let mlComms = conversion[f].polyCommsFromRust(wasmComms);
          let comms = polyCommsToJSON(mlComms);
          let bytes = new TextEncoder().encode(JSON.stringify(comms));

          writeCache(cache, header, bytes);
        }
      }
      return conversion[f].polyCommFromRust(commitment);
    },

    /**
     * Returns the Lagrange basis commitments for the whole domain
     */
    lagrangeCommitmentsWholeDomain(srs: WasmSrs, domainSize: number) {
      console.log('lagrangeCommitmentsWholeDomain');

      // instead of getting the entire commitment directly (which works for nodejs/servers), we get a pointer to the commitment
      // and then read the commitment from the pointer
      // this is because the web worker implementation currently does not support returning UintXArray's directly
      // hence we return a pointer from wasm, funnel it through the web worker
      // and then read the commitment from the pointer in the main thread (where UintXArray's are supported)
      // see https://github.com/o1-labs/o1js-bindings/blob/09e17b45e0c2ca2b51cd9ed756106e17ca1cf36d/js/web/worker-spec.js#L110-L115
      let ptr = lagrangeCommitmentsWholeDomainPtr(srs, domainSize);
      let wasmComms = getCommitmentsWholeDomainByPtr(ptr);
      let mlComms = conversion[f].polyCommsFromRust(wasmComms);
      return mlComms;
    },

    /**
     * adds Lagrange basis for a given domain size
     */
    addLagrangeBasis(srs: WasmSrs, logSize: number) {
      console.log('addLagrangeBasis');
      // this ensures that basis is stored on the srs, no need to duplicate caching logic
      this.lagrangeCommitment(srs, 1 << logSize, 0);
    },
  };
}

type PolyCommJson = {
  shifted: OrInfinityJson[];
  unshifted: OrInfinityJson | undefined;
};

function polyCommsToJSON(comms: MlArray<PolyComm>): PolyCommJson[] {
  return MlArray.mapFrom(comms, ([, elems]) => {
    return {
      shifted: MlArray.mapFrom(elems, OrInfinity.toJSON),
      unshifted: undefined,
    };
  });
}

function polyCommsFromJSON(json: PolyCommJson[]): MlArray<PolyComm> {
  return MlArray.mapTo(json, ({ shifted, unshifted }) => {
    return [0, MlArray.mapTo(shifted, OrInfinity.fromJSON)];
  });
}

function readCacheLazy(
  cache: Cache,
  header: CacheHeader,
  conversion: RustConversion,
  f: 'fp' | 'fq',
  srs: WasmSrs,
  domainSize: number,
  setLagrangeBasis: (srs: WasmSrs, domainSize: number, comms: Uint32Array) => void
) {
  if (CacheReadRegister.get(header.uniqueId) === true) return true;
  return readCache(cache, header, (bytes) => {
    let comms: PolyCommJson[] = JSON.parse(new TextDecoder().decode(bytes));
    let mlComms = polyCommsFromJSON(comms);
    let wasmComms = conversion[f].polyCommsToRust(mlComms);

    setLagrangeBasis(srs, domainSize, wasmComms);
    CacheReadRegister.set(header.uniqueId, true);
    return true;
  });
}
function runInTryCatch<T extends (...args: any[]) => any>(fn: T): T {
  return function (...args: Parameters<T>): ReturnType<T> {
    try {
      return fn(...args);
    } catch (e) {
      console.error(`Error in SRS function ${fn.name} with args:`, args);
      throw e;
    }
  } as T;
}
