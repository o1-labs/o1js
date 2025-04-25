import type { Wasm, RustConversion } from '../bindings.js';
import type {
  WasmFpSrs,
  WasmFqSrs,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import { PolyComm } from './kimchi-types.js';
import {
  type CacheHeader,
  type Cache,
  withVersion,
  writeCache,
  readCache,
} from '../../../lib/proof-system/cache.js';
import { assert } from '../../../lib/util/errors.js';
import { MlArray } from '../../../lib/ml/base.js';
import { OrInfinity, OrInfinityJson } from './curve.js';

export { srs, setSrsCache, unsetSrsCache };

type WasmSrs = WasmFpSrs | WasmFqSrs;

type SrsStore = Record<number, WasmSrs>;

function empty(): SrsStore {
  return {};
}

const srsStore = { fp: empty(), fq: empty() };

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
  let createSrs = (s: number) => wasm[`caml_${f}_srs_create_parallel`](s);
  let getSrs = wasm[`caml_${f}_srs_get`];
  let setSrs = wasm[`caml_${f}_srs_set`];

  let maybeLagrangeCommitment = wasm[`caml_${f}_srs_maybe_lagrange_commitment`];
  let lagrangeCommitment = (srs: WasmFpSrs, domain_size: number, i: number) =>
    wasm[`caml_${f}_srs_lagrange_commitment`](srs, domain_size, i);
  let lagrangeCommitmentsWholeDomainPtr = (srs: WasmSrs, domain_size: number) =>
    wasm[`caml_${f}_srs_lagrange_commitments_whole_domain_ptr`](
      srs,
      domain_size
    );
  let setLagrangeBasis = wasm[`caml_${f}_srs_set_lagrange_basis`];
  let getLagrangeBasis = (srs: WasmSrs, n: number) =>
    wasm[`caml_${f}_srs_get_lagrange_basis`](srs, n);
  let getCommitmentsWholeDomainByPtr =
    wasm[`caml_${f}_srs_lagrange_commitments_whole_domain_read_from_ptr`];
  return {
    /**
     * returns existing stored SRS or falls back to creating a new one
     */
    create(size: number): WasmSrs {
      let srs = srsStore[f][size] satisfies WasmSrs as WasmSrs | undefined;

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
            let jsonSrs: OrInfinityJson[] = JSON.parse(
              new TextDecoder().decode(bytes)
            );
            let mlSrs = MlArray.mapTo(jsonSrs, OrInfinity.fromJSON);
            let wasmSrs = conversion[f].pointsToRust(mlSrs);
            return setSrs(wasmSrs);
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
      return srsStore[f][size];
    },

    /**
     * returns ith Lagrange basis commitment for a given domain size
     */
    lagrangeCommitment(srs: WasmSrs, domainSize: number, i: number): PolyComm {
      // happy, fast case: if basis is already stored on the srs, return the ith commitment
      let commitment = maybeLagrangeCommitment(srs, domainSize, i);

      if (commitment === undefined) {
        if (cache === undefined) {
          // if there is no cache, recompute and store basis in memory
          commitment = lagrangeCommitment(srs, domainSize, i);
        } else {
          // try to read lagrange basis from cache / recompute and write if not found
          let header = cacheHeaderLagrange(f, domainSize);

          let didRead = readCache(cache, header, (bytes) => {
            let comms: PolyCommJson[] = JSON.parse(
              new TextDecoder().decode(bytes)
            );
            let mlComms = polyCommsFromJSON(comms);
            let wasmComms = conversion[f].polyCommsToRust(mlComms);

            setLagrangeBasis(srs, domainSize, wasmComms);
            return true;
          });

          if (didRead !== true) {
            // not in cache
            if (cache.canWrite) {
              // TODO: this code path will throw on the web since `caml_${f}_srs_get_lagrange_basis` is not properly implemented
              // using a writable cache in the browser seems to be fairly uncommon though, so it's at least an 80/20 solution
              let wasmComms = getLagrangeBasis(srs, domainSize);
              let mlComms = conversion[f].polyCommsFromRust(wasmComms);
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
      return conversion[f].polyCommFromRust(commitment);
    },

    /**
     * Returns the Lagrange basis commitments for the whole domain
     */
    lagrangeCommitmentsWholeDomain(srs: WasmSrs, domainSize: number) {
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
