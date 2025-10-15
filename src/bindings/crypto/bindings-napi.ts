import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';

export { bindingsNapi };

function bindingsNapi(napi: any) {
  return {
    fp: {
      lookupTablesToRust([, ...tables]: any) {
        // TODO: this needs to be tested with actual lookup tables
        return tables;
      },
      runtimeTableCfgsToRust([, ...cfgs]: any) {
        // TOODO: this needs to be tested with actual runtime table cfgs
        return cfgs;
      },
      vectorToRust: (fields: any) => {
        // console.log('values going in ', fields);
        let res = fieldsToRustFlat(fields);
        // console.log('values going out ', res);
        return res;
      },
      vectorFromRust: fieldsFromRustFlat,
    },
    fq: {
      lookupTablesToRust([, ...tables]: any) {
        // TODO: this needs to be tested with actual lookup tables
        return tables;
      },
      runtimeTableCfgsToRust([, ...cfgs]: any) {
        // TOODO: this needs to be tested with actual runtime table cfgs
        return cfgs;
      },
      vectorToRust: (fields: any) => {
        // console.log('values going in ', fields);
        let res = fieldsToRustFlat(fields);
        // console.log('values going out ', res);
        return res;
      },
      vectorFromRust: (fieldBytes: any) => {
        // console.log('values going in ', fieldBytes);
        let res = fieldsFromRustFlat(fieldBytes);
        // console.log('values going out ', res);
        return res;
      },
    },
  };
}
