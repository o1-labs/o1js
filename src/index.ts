export * from './snarky';
export * from './lib/signature';
export * from './lib/circuit_value';
export * from './lib/merkle_proof';

export * from './lib/int';
export * as Mina from './lib/mina';
export * as DataStore from './lib/data_store';
export * from './lib/snapp';
export * from './lib/optional';
export * from './lib/proof_system';
export * from './lib/party';

import * as util from 'util';
import * as Snarky from './snarky';

(Snarky.Field as any).prototype[util.inspect.custom] = function(depth: any, opts: any) {
  return (this as Snarky.Field).toJSON();
};

(Snarky.Group as any).prototype[util.inspect.custom] = function(depth: any, opts: any) {
  return (this as Snarky.Group).toJSON();
};

/*
import * as Foo from './examples/wip';

(async () => {
  console.log('a');
  await Snarky.isReady.catch((e) => console.log(e));
  await Foo.main().catch((e) => console.log('boo', e));
  console.log('b');
  Snarky.shutdown();
})().catch((e) => console.log(e));
*/
