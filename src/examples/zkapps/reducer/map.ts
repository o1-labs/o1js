import {
  Field,
  Struct,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  Reducer,
  provable,
  PublicKey,
  Bool,
  Poseidon,
  Provable,
  assert,
} from 'o1js';

/*

This contract emulates a "mapping" data structure, which is a key-value store, similar to a dictionary or hash table or `new Map<K, V>()` in JavaScript.
In this example, the keys are public keys, and the values are arbitrary field elements.

This utilizes the `Reducer` as an append online list of actions, which are then looked at to find the value corresponding to a specific key.

Warning: The reducer API in o1js is currently not safe to use in production applications. The reduce() 
method breaks if more than the hard-coded number (default: 32) of actions are pending. Work is actively 
in progress to mitigate this limitation.
  

```ts 
// js
const map = new Map<PublicKey, Field>();
map.set(key, value);
map.get(key);

// contract
await contract.deploy(); // ... deploy the contract
await contract.set(key, value); // ... set a key-value pair
await contract.get(key); // ... get a value by key
```
*/

class Option extends Struct({
  isSome: Bool,
  value: Field,
}) {}

const KeyValuePair = provable({
  key: Field,
  value: Field,
});

class StorageContract extends SmartContract {
  reducer = Reducer({
    actionType: KeyValuePair,
  });

  @method async set(key: PublicKey, value: Field) {
    this.reducer.dispatch({ key: Poseidon.hash(key.toFields()), value });
  }

  @method.returns(Option)
  async get(key: PublicKey) {
    let pendingActions = this.reducer.getActions({
      fromActionState: Reducer.initialActionState,
    });

    let keyHash = Poseidon.hash(key.toFields());

    let optionValue = this.reducer.reduce(
      pendingActions,
      Option,
      (state, action) => {
        let currentMatch = keyHash.equals(action.key);
        return {
          isSome: currentMatch.or(state.isSome),
          value: Provable.if(currentMatch, action.value, state.value),
        };
      },
      Option.empty(),
      { maxUpdatesWithActions: k }
    );

    return optionValue;
  }
}

let k = 1 << 4;

let Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
let cs = await StorageContract.analyzeMethods();

console.log(`method size for a "mapping" contract with ${k} entries`);
console.log('get rows:', cs['get'].rows);
console.log('set rows:', cs['set'].rows);

let [feePayer] = Local.testAccounts;

// the contract account
let contractAccount = Mina.TestPublicKey.random();
let contract = new StorageContract(contractAccount);

await StorageContract.compile();

let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await contract.deploy();
});
await tx.sign([feePayer.key, contractAccount.key]).send();

console.log('deployed');

let map: { key: PublicKey; value: Field }[] = [
  {
    key: PrivateKey.random().toPublicKey(),
    value: Field(192),
  },
  {
    key: PrivateKey.random().toPublicKey(),
    value: Field(151),
  },
  {
    key: PrivateKey.random().toPublicKey(),
    value: Field(781),
  },
];

let key = map[0].key;
let value = map[0].value;
console.log(`setting key ${key.toBase58()} with value ${value}`);

tx = await Mina.transaction(feePayer, async () => {
  await contract.set(key, value);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

key = map[1].key;
value = map[1].value;
console.log(`setting key ${key.toBase58()} with value ${value}`);

tx = await Mina.transaction(feePayer, async () => {
  await contract.set(key, value);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

key = map[2].key;
value = map[2].value;
console.log(`setting key ${key.toBase58()} with value ${value}`);

tx = await Mina.transaction(feePayer, async () => {
  await contract.set(key, value);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

key = map[0].key;
value = map[0].value;
console.log(`getting key ${key.toBase58()} with value ${value}`);

let result: Option | undefined;
tx = await Mina.transaction(feePayer, async () => {
  result = await contract.get(key);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

assert(result !== undefined);
console.log('found correct match?', result.isSome.toBoolean());
console.log('matches expected value?', result.value.equals(value).toBoolean());

key = map[1].key;
value = map[1].value;
console.log(`getting key ${key.toBase58()} with value ${value}`);

tx = await Mina.transaction(feePayer, async () => {
  result = await contract.get(key);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('found correct match?', result.isSome.toBoolean());
console.log('matches expected value?', result.value.equals(value).toBoolean());

console.log(`getting key invalid key`);
tx = await Mina.transaction(feePayer, async () => {
  result = await contract.get(PrivateKey.random().toPublicKey());
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('should be isSome(false)', result.isSome.toBoolean());
