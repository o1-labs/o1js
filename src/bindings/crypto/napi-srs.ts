import { MlArray } from '../../lib/ml/base.js';
import {
  readCache,
  withVersion,
  writeCache,
  type Cache,
  type CacheHeader,
} from '../../lib/proof-system/cache.js';
import { assert } from '../../lib/util/errors.js';
import { type WasmFpSrs, type WasmFqSrs } from '../compiled/node_bindings/plonk_wasm.cjs';
import type { Napi, RustConversion } from './bindings.js';
import { OrInfinity, OrInfinityJson } from './bindings/curve.js';
import { PolyComm } from './bindings/kimchi-types.js';

export { setSrsCache, srs, unsetSrsCache };

type NapiSrs = WasmFpSrs | WasmFqSrs;

type SrsStore = Record<number, NapiSrs>;

function empty(): SrsStore {
  return {};
}

const srsStore = { fp: empty(), fq: empty() };

type NapiAffine = ReturnType<RustConversion<'napi'>['fp']['pointToRust']>;
type NapiPolyComm = ReturnType<RustConversion<'napi'>['fp']['polyCommToRust']>;
type NapiPolyComms = ReturnType<RustConversion<'napi'>['fp']['polyCommsToRust']>;

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

function srs(napi: Napi, conversion: RustConversion<'napi'>) {
  return {
    fp: srsPerField('fp', napi, conversion),
    fq: srsPerField('fq', napi, conversion),
  };
}

function srsPerField(f: 'fp' | 'fq', napi: Napi, conversion: RustConversion<'napi'>) {
  // note: these functions are properly typed, thanks to TS template literal types
  let createSrs = (size: number) => {
    try {
      return napi[`caml_${f}_srs_create_parallel`](size);
    } catch (error) {
      console.error(`Error in SRS get for field ${f}`);
      throw error;
    }
  };

  let getSrs = (srs: NapiSrs): NapiAffine[] => {
    try {
      let fn = napi[`caml_${f}_srs_get`] as unknown as (value: NapiSrs) => NapiAffine[];
      return fn(srs);
    } catch (error) {
      console.error(`Error in SRS get for field ${f}`);
      throw error;
    }
  };
  let isEmptySrs = (srs: NapiSrs) => {
    try {
      let points = getSrs(srs);
      return points == null || points.length <= 1;
    } catch {
      return true;
    }
  };
  let setSrs = (points: NapiAffine[]) => {
    try {
      let fn = napi[`caml_${f}_srs_set`] as unknown as (value: NapiAffine[]) => NapiSrs;
      return fn(points);
    } catch (error) {
      console.error(`Error in SRS set for field ${f} args ${points}`);
      throw error;
    }
  };

  let maybeLagrangeCommitment = (
    srs: NapiSrs,
    domain_size: number,
    i: number
  ): NapiPolyComm | undefined | null => {
    try {
      let fn = napi[`caml_${f}_srs_maybe_lagrange_commitment`] as unknown as (
        srsValue: NapiSrs,
        domainSizeValue: number,
        index: number
      ) => NapiPolyComm | undefined | null;
      return fn(srs, domain_size, i);
    } catch (error) {
      console.error(`Error in SRS maybe lagrange commitment for field ${f}`);
      throw error;
    }
  };
  let lagrangeCommitment = (
    srs: NapiSrs,
    domain_size: number,
    i: number
  ): NapiPolyComm => {
    try {
      let fn = napi[`caml_${f}_srs_lagrange_commitment`] as unknown as (
        srsValue: NapiSrs,
        domainSizeValue: number,
        index: number
      ) => NapiPolyComm;
      return fn(srs, domain_size, i);
    } catch (error) {
      console.error(`Error in SRS lagrange commitment for field ${f}`);
      throw error;
    }
  };
  let setLagrangeBasis = (srs: NapiSrs, domain_size: number, input: NapiPolyComms) => {
    try {
      let fn = napi[`caml_${f}_srs_set_lagrange_basis`] as unknown as (
        srsValue: NapiSrs,
        domainSizeValue: number,
        comms: NapiPolyComms
      ) => void;
      return fn(srs, domain_size, input);
    } catch (error) {
      console.error(`Error in SRS set lagrange basis for field ${f}`);
      throw error;
    }
  };
  let getLagrangeBasis = (srs: NapiSrs, n: number): NapiPolyComms => {
    try {
      let fn = napi[`caml_${f}_srs_get_lagrange_basis`] as unknown as (
        srsValue: NapiSrs,
        nValue: number
      ) => NapiPolyComms;
      return fn(srs, n);
    } catch (error) {
      console.error(`Error in SRS get lagrange basis for field ${f}`);
      throw error;
    }
  };
  return {
    /**
     * returns existing stored SRS or falls back to creating a new one
     */
    create(size: number): NapiSrs {
      let srs = srsStore[f][size] satisfies NapiSrs as NapiSrs | undefined;

      if (srs !== undefined && isEmptySrs(srs)) {
        delete srsStore[f][size];
        srs = undefined;
      }

      if (srs === undefined) {
        if (cache === undefined) {
          // if there is no cache, create SRS in memory
          srs = createSrs(size);
        } else {
          let header = cacheHeaderSrs(f, size);

          // try to read SRS from cache / recompute and write if not found
          srs = readCache(cache, header, (bytes) => {
            // TODO: this takes a bit too long, about 300ms for 2^16
            // `pointsToRust` is the clear bottleneck
            let jsonSrs: OrInfinityJson[] = JSON.parse(new TextDecoder().decode(bytes));
            let mlSrs = MlArray.mapTo(jsonSrs, OrInfinity.fromJSON);
            let wasmSrs = conversion[f].pointsToRust(mlSrs);
            let candidate = setSrs(wasmSrs);
            if (isEmptySrs(candidate)) return undefined;
            return candidate;
          });
          if (srs === undefined) {
            // not in cache
            srs = createSrs(size);

            if (cache.canWrite) {
              let wasmSrs = getSrs(srs);
              let mlSrs = conversion[f].pointsFromRust(wasmSrs);
              let jsonSrs = MlArray.mapFrom(mlSrs, OrInfinity.toJSON);
              let bytes = new TextEncoder().encode(JSON.stringify(jsonSrs));

              writeCache(cache, header, bytes);
            }
          }
        }
        srsStore[f][size] = srs;
      }

      // TODO should we call freeOnFinalize() and expose a function to clean the SRS cache?
      //console.trace('Returning SRS:', srs);
      return srsStore[f][size];
    },

    /**
     * returns ith Lagrange basis commitment for a given domain size
     */
    lagrangeCommitment(srs: NapiSrs, domainSize: number, i: number): PolyComm {
      // happy, fast case: if basis is already stored on the srs, return the ith commitment
      let commitment = maybeLagrangeCommitment(srs, domainSize, i);

      if (commitment === undefined || commitment === null) {
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
              let napiComms = getLagrangeBasis(srs, domainSize);
              let mlComms = conversion[f].polyCommsFromRust(napiComms);
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
          let napiComms = getLagrangeBasis(srs, domainSize);
          let mlComms = conversion[f].polyCommsFromRust(napiComms);
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
    lagrangeCommitmentsWholeDomain(srs: NapiSrs, domainSize: number) {
      try {
        let napiComms = napi[`caml_${f}_srs_lagrange_commitments_whole_domain_ptr`](
          srs,
          domainSize
        );
        let mlComms = conversion[f].polyCommsFromRust(napiComms as any);
        return mlComms;
      } catch (error) {
        console.error(`Error in SRS lagrange commitments whole domain ptr for field ${f}`);
        throw error;
      }
    },

    /**
     * adds Lagrange basis for a given domain size
     */
    addLagrangeBasis(srs: NapiSrs, logSize: number) {
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
  conversion: RustConversion<'napi'>,
  f: 'fp' | 'fq',
  srs: NapiSrs,
  domainSize: number,
  setLagrangeBasis: (srs: NapiSrs, domainSize: number, comms: NapiPolyComms) => void
) {
  if (CacheReadRegister.get(header.uniqueId) === true) return true;
  return readCache(cache, header, (bytes) => {
    let comms: PolyCommJson[] = JSON.parse(new TextDecoder().decode(bytes));
    let mlComms = polyCommsFromJSON(comms);
    let napiComms = conversion[f].polyCommsToRust(mlComms);

    setLagrangeBasis(srs, domainSize, napiComms);
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
