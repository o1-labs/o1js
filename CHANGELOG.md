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

## [Unreleased](https://github.com/o1-labs/snarkyjs/compare/4f0dd40...HEAD)

### Added

- `reducer.getActions` partially implemented for local testing https://github.com/o1-labs/snarkyjs/pull/327
- `gte` and `assertGte` methods on `UInt32`, `UInt64` https://github.com/o1-labs/snarkyjs/pull/349

### Changed

- **Breaking change:** Rename the `Party` class to `AccountUpdate`

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
- Custom tokens (_experimental_), via `this.experimental.token`. RFC: https://github.com/o1-labs/snarkyjs/issues/233, PR: https://github.com/o1-labs/snarkyjs/pull/273,
- Actions / sequence events support (_experimental_), via `Experimental.Reducer`. RFC: https://github.com/o1-labs/snarkyjs/issues/265, PR: https://github.com/o1-labs/snarkyjs/pull/274
- Merkle tree implementation (_experimental_) via `Experimental.MerkleTree` https://github.com/o1-labs/snarkyjs/pull/343

### Changed

- BREAKING CHANGE: Make on-chain state consistent with other preconditions - throw an error when state is not explicitly constrained https://github.com/o1-labs/snarkyjs/pull/267
- `CircuitValue` improvements https://github.com/o1-labs/snarkyjs/pull/269, https://github.com/o1-labs/snarkyjs/pull/306, https://github.com/o1-labs/snarkyjs/pull/341
  - Added a base constructor, so overriding the constructor on classes that extend `CircuitValue` is now _optional_. When overriding, the base constructor can be called without arguments, as previously: `super()`. When not overriding, the expected arguments are all the `@prop`s on the class, in the order they were defined in: `new MyCircuitValue(prop1, prop2)`.
  - `CircuitValue.fromObject({ prop1, prop2 })` is a new, better-typed alternative for using the base constructor.
  - Fixed: the overridden constructor is now free to have any argument structure -- previously, arguments had to be the props in their declared order. I.e., the behaviour that's now used by the base constructor used to be forced on all constructors, which is no longer the case.
- `Mina.transaction` improvements
  - Support zkApp proofs when there are other parties in the same transaction block https://github.com/o1-labs/snarkyjs/pull/280
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
