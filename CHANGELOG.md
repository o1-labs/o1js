# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
  Possible subsections:
    _Added_ for new features.
    _Changed_ for changes in existing functionality.
    _Deprecated_ for soon-to-be removed features.
    _Removed_ for now removed features.
    _Fixed_ for any bug fixes.
    _Security_ in case of vulnerabilities.
 -->

## [Unreleased](https://github.com/o1-labs/snarkyjs/compare/d880bd6e...HEAD)

### Added

- `this.account.<field>.set()` as a unified API to update fields on the account https://github.com/o1-labs/snarkyjs/pull/643
  - covers `permissions`, `verificationKey`, `zkappUri`, `tokenSymbol`, `delegate`, `votingFor`
  - exists on `SmartContract.account` and `AccountUpdate.account`
- `this.sender` to get the public key of the transaction's sender https://github.com/o1-labs/snarkyjs/pull/652
  - To get the sender outside a smart contract, there's now `Mina.sender()`
- `tx.wait()` is now implemented. It waits for the transactions inclusion in a block https://github.com/o1-labs/snarkyjs/pull/645
  - `wait()` also now takes an optional `options` parameter to specify the polling interval or maximum attempts. `wait(options?: { maxAttempts?: number; interval?: number }): Promise<void>;`
- `Circuit.constraintSystemFromKeypair(keypair)` to inspect the circuit at a low level https://github.com/o1-labs/snarkyjs/pull/529
  - Works with a `keypair` (prover + verifier key) generated with the `Circuit` API
- `Mina.faucet()` can now be used to programmatically fund an address on the testnet, using the faucet provided by MinaExplorer https://github.com/o1-labs/snarkyjs/pull/693

### Changed

- BREAKING CHANGE: Constraint changes in `sign()`, `requireSignature()` and `createSigned()` on `AccountUpdate` / `SmartContract`. _This means that smart contracts using these methods in their proofs won't be able to create valid proofs against old deployed verification keys._ https://github.com/o1-labs/snarkyjs/pull/637
- `Mina.transaction` now takes a _public key_ as the fee payer argument (passing in a private key is deprecated) https://github.com/o1-labs/snarkyjs/pull/652
  - Before: `Mina.transaction(privateKey, ...)`. Now: `Mina.transaction(publicKey, ...)`
  - `AccountUpdate.fundNewAccount()` now enables funding multiple accounts at once, and deprecates the `initialBalance` argument
- New option `enforceTransactionLimits` for `LocalBlockchain` (default value: `true`), to disable the enforcement of protocol transaction limits (maximum events, maximum sequence events and enforcing certain layout of `AccountUpdate`s depending on their authorization) https://github.com/o1-labs/snarkyjs/pull/620
- Change the default `send` permissions (for sending MINA or tokens) that get set when deploying a zkApp, from `signature()` to `proof()` https://github.com/o1-labs/snarkyjs/pull/648

### Deprecated

- `this.setPermissions()` in favor of `this.account.permissions.set()` https://github.com/o1-labs/snarkyjs/pull/643
  - `this.tokenSymbol.set()` in favor of `this.account.tokenSymbol.set()`
  - `this.setValue()` in favor of `this.account.<field>.set()`
- `Mina.transaction(privateKey: PrivateKey, ...)` in favor of new signature `Mina.transaction(publicKey: PublicKey, ...)`
- `AccountUpdate.createSigned(privateKey: PrivateKey)` in favor of new signature `AccountUpdate.createSigned(publicKey: PublicKey)` https://github.com/o1-labs/snarkyjs/pull/637

### Fixed

- Type inference for Structs with instance methods https://github.com/o1-labs/snarkyjs/pull/567
  - also fixes `Struct.fromJSON`
- `SmartContract.fetchEvents` fixed when multiple event types existed https://github.com/o1-labs/snarkyjs/issues/627
- Error when using reduce with a `Struct` as state type https://github.com/o1-labs/snarkyjs/pull/689
- Fix use of stale cached accounts in `Mina.transaction` https://github.com/o1-labs/snarkyjs/issues/430
- Fixed Apple silicon performance issue https://github.com/o1-labs/snarkyjs/issues/491

## [0.7.3](https://github.com/o1-labs/snarkyjs/compare/5f20f496...d880bd6e)

### Fixed

- Bug in `deploy()` when initializing a contract that already exists https://github.com/o1-labs/snarkyjs/pull/588

### Deprecated

- `Mina.BerkeleyQANet` in favor of the clearer-named `Mina.Network` https://github.com/o1-labs/snarkyjs/pull/588

## [0.7.2](https://github.com/o1-labs/snarkyjs/compare/705f58d3...5f20f496)

### Added

- `MerkleMap` and `MerkleMapWitness` https://github.com/o1-labs/snarkyjs/pull/546
- Lots of doc comments! https://github.com/o1-labs/snarkyjs/pull/580

### Fixed

- Bug in `Circuit.log` printing account updates https://github.com/o1-labs/snarkyjs/pull/578

## [0.7.1](https://github.com/o1-labs/snarkyjs/compare/f0837188...705f58d3)

### Fixed

- Testnet-incompatible signatures in v0.7.0 https://github.com/o1-labs/snarkyjs/pull/565

## [0.7.0](https://github.com/o1-labs/snarkyjs/compare/f0837188...9a94231c)

### Added

- Added an optional string parameter to certain `assert` methods https://github.com/o1-labs/snarkyjs/pull/470
- `Struct`, a new primitive for declaring composite, SNARK-compatible types https://github.com/o1-labs/snarkyjs/pull/416
  - With this, we also added a way to include auxiliary, non-field element data in composite types
  - Added `VerificationKey`, which is a `Struct` with auxiliary data, to pass verification keys to a `@method`
  - BREAKING CHANGE: Change names related to circuit types: `AsFieldsAndAux<T>` -> `Provable<T>`, `AsFieldElement<T>` -> `ProvablePure<T>`, `circuitValue` -> `provable`
  - BREAKING CHANGE: Change all `ofFields` and `ofBits` methods on circuit types to `fromFields` and `fromBits`
- New option `proofsEnabled` for `LocalBlockchain` (default value: `true`), to quickly test transaction logic with proofs disabled https://github.com/o1-labs/snarkyjs/pull/462
  - with `proofsEnabled: true`, proofs now get verified locally https://github.com/o1-labs/snarkyjs/pull/423
- `SmartContract.approve()` to approve a tree of child account updates https://github.com/o1-labs/snarkyjs/pull/428 https://github.com/o1-labs/snarkyjs/pull/534
  - AccountUpdates are now valid `@method` arguments, and `approve()` is intended to be used on them when passed to a method
  - Also replaces `Experimental.accountUpdateFromCallback()`
- `Circuit.log()` to easily log Fields and other provable types inside a method, with the same API as `console.log()` https://github.com/o1-labs/snarkyjs/pull/484
- `SmartContract.init()` is a new method on the base `SmartContract` that will be called only during the first deploy (not if you re-deploy later to upgrade the contract) https://github.com/o1-labs/snarkyjs/pull/543
  - Overriding `init()` is the new recommended way to add custom state initialization logic.
- `transaction.toPretty()` and `accountUpdate.toPretty()` for debugging transactions by printing only the pieces that differ from default account updates https://github.com/o1-labs/snarkyjs/pull/428
- `AccountUpdate.attachToTransaction()` for explicitly adding an account update to the current transaction. This replaces some previous behaviour where an account update got attached implicitly https://github.com/o1-labs/snarkyjs/pull/484
- `SmartContract.requireSignature()` and `AccountUpdate.requireSignature()` as a simpler, better-named replacement for `.sign()` https://github.com/o1-labs/snarkyjs/pull/558

### Changed

- BREAKING CHANGE: `tx.send()` is now asynchronous: old: `send(): TransactionId` new: `send(): Promise<TransactionId>` and `tx.send()` now directly waits for the network response, as opposed to `tx.send().wait()` https://github.com/o1-labs/snarkyjs/pull/423
- Sending transactions to `LocalBlockchain` now involves
- `Circuit.witness` can now be called outside circuits, where it will just directly return the callback result https://github.com/o1-labs/snarkyjs/pull/484
- The `FeePayerSpec`, which is used to specify properties of the transaction via `Mina.transaction()`, now has another optional parameter to specify the nonce manually. `Mina.transaction({ feePayerKey: feePayer, nonce: 1 }, () => {})` https://github.com/o1-labs/snarkyjs/pull/497
- BREAKING CHANGE: Static methods of type `.fromString()`, `.fromNumber()` and `.fromBigInt()` on `Field`, `UInt64`, `UInt32` and `Int64` are no longer supported https://github.com/o1-labs/snarkyjs/pull/519
  - use `Field(number | string | bigint)` and `UInt64.from(number | string | bigint)`
- Move several features out of 'experimental' https://github.com/o1-labs/snarkyjs/pull/555
  - `Reducer` replaces `Experimental.Reducer`
  - `MerkleTree` and `MerkleWitness` replace `Experimental.{MerkleTree,MerkleWitness}`
  - In a `SmartContract`, `this.token` replaces `this.experimental.token`

### Deprecated

- `CircuitValue` deprecated in favor of `Struct` https://github.com/o1-labs/snarkyjs/pull/416
- Static props `Field.zero`, `Field.one`, `Field.minusOne` deprecated in favor of `Field(number)` https://github.com/o1-labs/snarkyjs/pull/524
- `SmartContract.sign()` and `AccountUpdate.sign()` in favor of `.requireSignature()` https://github.com/o1-labs/snarkyjs/pull/558

### Fixed

- Uint comparisons and division fixed inside the prover https://github.com/o1-labs/snarkyjs/pull/503
- Callback arguments are properly passed into method invocations https://github.com/o1-labs/snarkyjs/pull/516
- Removed internal type `JSONValue` from public interfaces https://github.com/o1-labs/snarkyjs/pull/536
- Returning values from a zkApp https://github.com/o1-labs/snarkyjs/pull/461

### Fixed

- Callback arguments are properly passed into method invocations https://github.com/o1-labs/snarkyjs/pull/516

## [0.6.1](https://github.com/o1-labs/snarkyjs/compare/ba688523...f0837188)

### Fixed

- Proof verification on the web version https://github.com/o1-labs/snarkyjs/pull/476

## [0.6.0](https://github.com/o1-labs/snarkyjs/compare/f2ad423...ba688523)

### Added

- `reducer.getActions` partially implemented for local testing https://github.com/o1-labs/snarkyjs/pull/327
- `gte` and `assertGte` methods on `UInt32`, `UInt64` https://github.com/o1-labs/snarkyjs/pull/349
- Return sent transaction `hash` for `RemoteBlockchain` https://github.com/o1-labs/snarkyjs/pull/399

### Changed

- BREAKING CHANGE: Rename the `Party` class to `AccountUpdate`. Also, rename other occurrences of "party" to "account update". https://github.com/o1-labs/snarkyjs/pull/393
- BREAKING CHANGE: Don't require the account address as input to `SmartContract.compile()`, `SmartContract.digest()` and `SmartContract.analyzeMethods()` https://github.com/o1-labs/snarkyjs/pull/406
  - This works because the address / public key is now a variable in the method circuit; it used to be a constant
- BREAKING CHANGE: Move `ZkProgram` to `Experimental.ZkProgram`

## [0.5.4](https://github.com/o1-labs/snarkyjs/compare/3461333...f2ad423)

### Fixed

- Running snarkyjs inside a web worker https://github.com/o1-labs/snarkyjs/issues/378

## [0.5.3](https://github.com/o1-labs/snarkyjs/compare/4f0dd40...3461333)

### Fixed

- Infinite loop when compiling in web version https://github.com/o1-labs/snarkyjs/issues/379, by @maht0rz

## [0.5.2](https://github.com/o1-labs/snarkyjs/compare/55c8ea0...4f0dd40)

### Fixed

- Crash of the web version introduced in 0.5.0
- Issue with `Experimental.MerkleWitness` https://github.com/o1-labs/snarkyjs/pull/368

## [0.5.1](https://github.com/o1-labs/snarkyjs/compare/e0192f7...55c8ea0)

### Fixed

- `fetchAccount` https://github.com/o1-labs/snarkyjs/pull/350

## [0.5.0](https://github.com/o1-labs/snarkyjs/compare/2375f08...e0192f7)

### Added

- **Recursive proofs**. RFC: https://github.com/o1-labs/snarkyjs/issues/89, PRs: https://github.com/o1-labs/snarkyjs/pull/245 https://github.com/o1-labs/snarkyjs/pull/250 https://github.com/o1-labs/snarkyjs/pull/261
  - Enable smart contract methods to take previous proofs as arguments, and verify them in the circuit
  - Add `ZkProgram`, a new primitive which represents a collection of circuits that produce instances of the same proof. So, it's a more general version of `SmartContract`, without any of the Mina-related API.  
    `ZkProgram` is suitable for rollup-type systems and offchain usage of Pickles + Kimchi.
- **zkApp composability** -- calling other zkApps from inside zkApps. RFC: https://github.com/o1-labs/snarkyjs/issues/303, PRs: https://github.com/o1-labs/snarkyjs/pull/285, https://github.com/o1-labs/snarkyjs/pull/296, https://github.com/o1-labs/snarkyjs/pull/294, https://github.com/o1-labs/snarkyjs/pull/297
- **Events** support via `SmartContract.events`, `this.emitEvent`. RFC: https://github.com/o1-labs/snarkyjs/issues/248, PR: https://github.com/o1-labs/snarkyjs/pull/272
  - `fetchEvents` partially implemented for local testing: https://github.com/o1-labs/snarkyjs/pull/323
- **Payments**: `this.send({ to, amount })` as an easier API for sending Mina from smart contracts https://github.com/o1-labs/snarkyjs/pull/325
  - `Party.send()` to transfer Mina between any accounts, for example, from users to smart contracts
- `SmartContract.digest()` to quickly compute a hash of the contract's circuit. This is [used by the zkApp CLI](https://github.com/o1-labs/zkapp-cli/pull/233) to figure out whether `compile` should be re-run or a cached verification key can be used. https://github.com/o1-labs/snarkyjs/pull/268
- `Circuit.constraintSystem()` for creating a circuit from a function, counting the number of constraints and computing a digest of the circuit https://github.com/o1-labs/snarkyjs/pull/279
- `this.account.isNew` to assert that an account did not (or did) exist before the transaction https://github.com/MinaProtocol/mina/pull/11524
- `LocalBlockchain.setTimestamp` and other setters for network state, to test network preconditions locally https://github.com/o1-labs/snarkyjs/pull/329
- **Experimental APIs** are now collected under the `Experimental` import, or on `this.experimental` in a smart contract.
- Custom tokens (_experimental_), via `this.token`. RFC: https://github.com/o1-labs/snarkyjs/issues/233, PR: https://github.com/o1-labs/snarkyjs/pull/273,
- Actions / sequence events support (_experimental_), via `Experimental.Reducer`. RFC: https://github.com/o1-labs/snarkyjs/issues/265, PR: https://github.com/o1-labs/snarkyjs/pull/274
- Merkle tree implementation (_experimental_) via `Experimental.MerkleTree` https://github.com/o1-labs/snarkyjs/pull/343

### Changed

- BREAKING CHANGE: Make on-chain state consistent with other preconditions - throw an error when state is not explicitly constrained https://github.com/o1-labs/snarkyjs/pull/267
- `CircuitValue` improvements https://github.com/o1-labs/snarkyjs/pull/269, https://github.com/o1-labs/snarkyjs/pull/306, https://github.com/o1-labs/snarkyjs/pull/341
  - Added a base constructor, so overriding the constructor on classes that extend `CircuitValue` is now _optional_. When overriding, the base constructor can be called without arguments, as previously: `super()`. When not overriding, the expected arguments are all the `@prop`s on the class, in the order they were defined in: `new MyCircuitValue(prop1, prop2)`.
  - `CircuitValue.fromObject({ prop1, prop2 })` is a new, better-typed alternative for using the base constructor.
  - Fixed: the overridden constructor is now free to have any argument structure -- previously, arguments had to be the props in their declared order. I.e., the behaviour that's now used by the base constructor used to be forced on all constructors, which is no longer the case.
- `Mina.transaction` improvements
  - Support zkApp proofs when there are other account updates in the same transaction block https://github.com/o1-labs/snarkyjs/pull/280
  - Support multiple independent zkApp proofs in one transaction block https://github.com/o1-labs/snarkyjs/pull/296
- Add previously unimplemented preconditions, like `this.network.timestamp` https://github.com/o1-labs/snarkyjs/pull/324 https://github.com/MinaProtocol/mina/pull/11577
- Improve error messages thrown from Wasm, by making Rust's `panic` log to the JS console https://github.com/MinaProtocol/mina/pull/11644
- Not user-facing, but essential: Smart contracts fully constrain the account updates they create, inside the circuit https://github.com/o1-labs/snarkyjs/pull/278

### Fixed

- Fix comparisons on `UInt32` and `UInt64` (`UInt32.lt`, `UInt32.gt`, etc) https://github.com/o1-labs/snarkyjs/issues/174, https://github.com/o1-labs/snarkyjs/issues/101. PR: https://github.com/o1-labs/snarkyjs/pull/307

## [0.4.3](https://github.com/o1-labs/snarkyjs/compare/e66f08d...2375f08)

### Added

- Implement the [precondition RFC](https://github.com/o1-labs/snarkyjs/issues/179#issuecomment-1139413831):
  - new fields `this.account` and `this.network` on both `SmartContract` and `Party`
  - `this.<account|network>.<property>.get()` to use on-chain values in a circuit, e.g. account balance or block height
  - `this.<account|network>.<property>.{assertEqual, assertBetween, assertNothing}()` to constrain what values to allow for these
- `CircuitString`, a snark-compatible string type with methods like `.append()` https://github.com/o1-labs/snarkyjs/pull/155
- `bool.assertTrue()`, `bool.assertFalse()` as convenient aliases for existing functionality
- `Ledger.verifyPartyProof` which can check if a proof on a transaction is valid https://github.com/o1-labs/snarkyjs/pull/208
- Memo field in APIs like `Mina.transaction` to attach arbitrary messages https://github.com/o1-labs/snarkyjs/pull/244
- This changelog

### Changed

- Huge snark performance improvements (2-10x) for most zkApps https://github.com/MinaProtocol/mina/pull/11053
- Performance improvements in node with > 4 CPUs, for all snarks https://github.com/MinaProtocol/mina/pull/11292
- Substantial reduction of snarkyjs' size https://github.com/MinaProtocol/mina/pull/11166

### Removed

- Unused functions `call` and `callUnproved`, which were embryonic versions of what is now the `transaction` API to call smart contract methods
- Some unimplemented fields on `SmartContract`

### Fixed

- zkApp proving on web https://github.com/o1-labs/snarkyjs/issues/226
