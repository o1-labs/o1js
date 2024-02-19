# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
  Possible subsections:
    _Added_ for new features.
    _Changed_ for changes in existing functionality.
    _Deprecated_ for soon-to-be removed features.
    _Removed_ for now removed features.
    _Fixed_ for any bug fixes.
    _Security_ in case of vulnerabilities.
 -->

## [Unreleased](https://github.com/o1-labs/o1js/compare/3b5f7c7...HEAD)

### Added

- Support for custom network identifiers other than `mainnet` or `testnet` https://github.com/o1-labs/o1js/pull/1444
  - New optional argument `networkId?: string` to `Signature.create()` and `Signature.verify()` to reflect support for custom network identifiers.

## [0.16.1](https://github.com/o1-labs/o1js/compare/834a44002...3b5f7c7)

### Breaking changes

- Remove `AccountUpdate.children` and `AccountUpdate.parent` properties https://github.com/o1-labs/o1js/pull/1402
  - Also removes the optional `AccountUpdatesLayout` argument to `approve()`
  - Adds `AccountUpdateTree` and `AccountUpdateForest`, new classes that represent a layout of account updates explicitly
  - Both of the new types are now accepted as inputs to `approve()`
  - `accountUpdate.extractTree()` to obtain the tree associated with an account update in the current transaction context.
- Remove `Experimental.Callback` API https://github.com/o1-labs/o1js/pull/1430

### Added

- `MerkleList<T>` to enable provable operations on a dynamically-sized list https://github.com/o1-labs/o1js/pull/1398
  - including `MerkleListIterator<T>` to iterate over a merkle list
- `TokenContract`, a new base smart contract class for token contracts https://github.com/o1-labs/o1js/pull/1384
  - Usage example: `https://github.com/o1-labs/o1js/blob/main/src/lib/mina/token/token-contract.unit-test.ts`
- `TokenAccountUpdateIterator`, a primitive to iterate over all token account updates in a transaction https://github.com/o1-labs/o1js/pull/1398
  - this is used to implement `TokenContract` under the hood

### Fixed

- Mainnet support. https://github.com/o1-labs/o1js/pull/1437

## [0.16.0](https://github.com/o1-labs/o1js/compare/e5d1e0f...834a44002)

### Breaking changes

- Protocol change that adds a "transaction version" to the permission to set verification keys https://github.com/MinaProtocol/mina/pull/14407
  - See [the relevant RFC](https://github.com/MinaProtocol/mina/blob/9577ad689a8e4d4f97e1d0fc3d26e20219f4abd1/rfcs/0051-verification-key-permissions.md) for the motivation behind this change
  - Breaks all deployed contracts, as it changes the account update layout

### Added

- Provable type `Packed<T>` to pack small field elements into fewer field elements https://github.com/o1-labs/o1js/pull/1376
- Provable type `Hashed<T>` to represent provable types by their hash https://github.com/o1-labs/o1js/pull/1377
  - This also exposes `Poseidon.hashPacked()` to efficiently hash an arbitrary type

### Changed

- Reduce number of constraints of ECDSA verification by 5% https://github.com/o1-labs/o1js/pull/1376

## [0.15.4](https://github.com/o1-labs/o1js/compare/be748e42e...e5d1e0f)

### Changed

- Improve performance of Wasm Poseidon hashing by a factor of 13x https://github.com/o1-labs/o1js/pull/1378
  - Speeds up local blockchain tests without proving by ~40%
- Improve performance of Field inverse https://github.com/o1-labs/o1js/pull/1373
  - Speeds up proving by ~2-4%

### Added

- Configurable `networkId` when declaring a Mina instance. https://github.com/o1-labs/o1js/pull/1387
  - Defaults to `"testnet"`, the other option is `"mainnet"`
  - The `networkId` parameter influences the algorithm used for signatures, and ensures that testnet transactions can't be replayed on mainnet

## [0.15.3](https://github.com/o1-labs/o1js/compare/1ad7333e9e...be748e42e)

### Added

- **SHA256 hash function** exposed via `Hash.SHA2_256` or `Gadgets.SHA256`. https://github.com/o1-labs/o1js/pull/1285

### Changed

- `Mina.accountCreationFee()` is deprecated in favor of `Mina.getNetworkConstants().accountCreationFee`. https://github.com/o1-labs/o1js/pull/1367
  - `Mina.getNetworkConstants()` returns:
    - [default](https://github.com/o1-labs/o1js/pull/1367/files#diff-ef2c3547d64a8eaa8253cd82b3623288f3271e14f1dc893a0a3ddc1ff4b9688fR7) network constants if used outside of the transaction scope.
    - [actual](https://github.com/o1-labs/o1js/pull/1367/files#diff-437f2c15df7c90ad8154c5de1677ec0838d51859bcc0a0cefd8a0424b5736f31R1051) network constants if used within the transaction scope.

### Fixed

- Fix approving of complex account update layouts https://github.com/o1-labs/o1js/pull/1364

## [0.15.2](https://github.com/o1-labs/o1js/compare/1ad7333e9e...08ba27329)

### Fixed

- Fix bug in `Hash.hash()` which always resulted in an error https://github.com/o1-labs/o1js/pull/1346

## [0.15.1](https://github.com/o1-labs/o1js/compare/1ad7333e9e...19115a159)

### Breaking changes

- Rename `Gadgets.rotate()` to `Gadgets.rotate64()` to better reflect the amount of bits the gadget operates on. https://github.com/o1-labs/o1js/pull/1259
- Rename `Gadgets.{leftShift(), rightShift()}` to `Gadgets.{leftShift64(), rightShift64()}` to better reflect the amount of bits the gadget operates on. https://github.com/o1-labs/o1js/pull/1259

### Added

- Non-native elliptic curve operations exposed through `createForeignCurve()` class factory https://github.com/o1-labs/o1js/pull/1007
- **ECDSA signature verification** exposed through `createEcdsa()` class factory https://github.com/o1-labs/o1js/pull/1240 https://github.com/o1-labs/o1js/pull/1007 https://github.com/o1-labs/o1js/pull/1307
  - For an example, see `./src/examples/crypto/ecdsa`
- **Keccak/SHA3 hash function** exposed on `Keccak` namespace https://github.com/o1-labs/o1js/pull/1291
- `Hash` namespace which holds all hash functions https://github.com/o1-labs/o1js/pull/999
  - `Bytes`, provable type to hold a byte array, which serves as input and output for Keccak variants
  - `UInt8`, provable type to hold a single byte, which is constrained to be in the 0 to 255 range
- `Gadgets.rotate32()` for rotation over 32 bit values https://github.com/o1-labs/o1js/pull/1259
- `Gadgets.leftShift32()` for left shift over 32 bit values https://github.com/o1-labs/o1js/pull/1259
- `Gadgets.divMod32()` division modulo 2^32 that returns the remainder and quotient of the operation https://github.com/o1-labs/o1js/pull/1259
- `Gadgets.rangeCheck32()` range check for 32 bit values https://github.com/o1-labs/o1js/pull/1259
- `Gadgets.addMod32()` addition modulo 2^32 https://github.com/o1-labs/o1js/pull/1259
- Expose new bitwise gadgets on `UInt32` and `UInt64` https://github.com/o1-labs/o1js/pull/1259
  - bitwise XOR via `{UInt32, UInt64}.xor()`
  - bitwise NOT via `{UInt32, UInt64}.not()`
  - bitwise ROTATE via `{UInt32, UInt64}.rotate()`
  - bitwise LEFTSHIFT via `{UInt32, UInt64}.leftShift()`
  - bitwise RIGHTSHIFT via `{UInt32, UInt64}.rightShift()`
  - bitwise AND via `{UInt32, UInt64}.and()`
- Example for using actions to store a map data structure https://github.com/o1-labs/o1js/pull/1300
- `Provable.constraintSystem()` and `{ZkProgram,SmartContract}.analyzeMethods()` return a `summary()` method to return a summary of the constraints used by a method https://github.com/o1-labs/o1js/pull/1007
- `assert()` asserts that a given statement is true https://github.com/o1-labs/o1js/pull/1285

### Fixed

- Fix stack overflows when calling provable methods with large inputs https://github.com/o1-labs/o1js/pull/1334
- Fix `Local.setProofsEnabled()` which would not get picked up by `deploy()` https://github.com/o1-labs/o1js/pull/1330
- Remove usage of private class fields in core types like `Field`, for better type compatibility between different o1js versions https://github.com/o1-labs/o1js/pull/1319

## [0.15.0](https://github.com/o1-labs/o1js/compare/1ad7333e9e...7acf19d0d)

### Breaking changes

- `ZkProgram.compile()` now returns the verification key and its hash, to be consistent with `SmartContract.compile()` https://github.com/o1-labs/o1js/pull/1292 [@rpanic](https://github.com/rpanic)

### Added

- **Foreign field arithmetic** exposed through the `createForeignField()` class factory https://github.com/o1-labs/snarkyjs/pull/985
- `Crypto` namespace which exposes elliptic curve and finite field arithmetic on bigints, as well as example curve parameters https://github.com/o1-labs/o1js/pull/1240
- `Gadgets.ForeignField.assertMul()` for efficiently constraining products of sums in non-native arithmetic https://github.com/o1-labs/o1js/pull/1262
- `Unconstrained` for safely maintaining unconstrained values in provable code https://github.com/o1-labs/o1js/pull/1262
- `Gadgets.rangeCheck8()` to assert that a value fits in 8 bits https://github.com/o1-labs/o1js/pull/1288

### Changed

- Change precondition APIs to use "require" instead of "assert" as the verb, to distinguish them from provable assertions. [@LuffySama-Dev](https://github.com/LuffySama-Dev)
  - `this.x.getAndAssertEquals()` is now `this.x.getAndRequireEquals()` https://github.com/o1-labs/o1js/pull/1263
  - `this.x.assertEquals(x)` is now `this.x.requireEquals(x)` https://github.com/o1-labs/o1js/pull/1263
  - `this.account.x.getAndAssertEquals(x)` is now `this.account.x.requireEquals(x)` https://github.com/o1-labs/o1js/pull/1265
  - `this.account.x.assertBetween()` is now `this.account.x.requireBetween()` https://github.com/o1-labs/o1js/pull/1265
  - `this.network.x.getAndAssertEquals()` is now `this.network.x.getAndRequireEquals()` https://github.com/o1-labs/o1js/pull/1265
- `Provable.constraintSystem()` and `{ZkProgram,SmartContract}.analyzeMethods()` return a `print()` method for pretty-printing the constraint system https://github.com/o1-labs/o1js/pull/1240

### Fixed

- Fix missing recursive verification of proofs in smart contracts https://github.com/o1-labs/o1js/pull/1302

## [0.14.2](https://github.com/o1-labs/o1js/compare/26363465d...1ad7333e9e)

### Breaking changes

- Change return signature of `ZkProgram.analyzeMethods()` to be a keyed object https://github.com/o1-labs/o1js/pull/1223

### Added

- Provable non-native field arithmetic:
  - `Gadgets.ForeignField.{add, sub, sumchain}()` for addition and subtraction https://github.com/o1-labs/o1js/pull/1220
  - `Gadgets.ForeignField.{mul, inv, div}()` for multiplication and division https://github.com/o1-labs/o1js/pull/1223
- Comprehensive internal testing of constraint system layouts generated by new gadgets https://github.com/o1-labs/o1js/pull/1241 https://github.com/o1-labs/o1js/pull/1220

### Changed

- `Lightnet` namespace API updates with added `listAcquiredKeyPairs()` method https://github.com/o1-labs/o1js/pull/1256
- Expose raw provable methods of a `ZkProgram` on `zkProgram.rawMethods` https://github.com/o1-labs/o1js/pull/1241
- Reduce number of constraints needed by `rotate()`, `leftShift()` and, `rightShift()` gadgets https://github.com/o1-labs/o1js/pull/1201

### Fixed

- Add a parameter to `checkZkappTransaction` for block length to check for transaction inclusion. This fixes a case where `Transaction.wait()` only checked the latest block, which led to an error once the transaction was included in a block that was not the latest. https://github.com/o1-labs/o1js/pull/1239

## [0.14.1](https://github.com/o1-labs/o1js/compare/e8e7510e1...26363465d)

### Added

- `Gadgets.not()`, new provable method to support bitwise not. https://github.com/o1-labs/o1js/pull/1198
- `Gadgets.leftShift() / Gadgets.rightShift()`, new provable methods to support bitwise shifting. https://github.com/o1-labs/o1js/pull/1194
- `Gadgets.and()`, new provable method to support bitwise and. https://github.com/o1-labs/o1js/pull/1193
- `Gadgets.multiRangeCheck()` and `Gadgets.compactMultiRangeCheck()`, two building blocks for non-native arithmetic with bigints of size up to 264 bits. https://github.com/o1-labs/o1js/pull/1216

### Fixed

- Removed array reversal of fetched actions, since they are returned in the correct order. https://github.com/o1-labs/o1js/pull/1258

## [0.14.0](https://github.com/o1-labs/o1js/compare/045faa7...e8e7510e1)

### Breaking changes

- Constraint optimizations in Field methods and core crypto changes break all verification keys https://github.com/o1-labs/o1js/pull/1171 https://github.com/o1-labs/o1js/pull/1178

### Changed

- `ZkProgram` has moved out of the `Experimental` namespace and is now available as a top-level import directly. `Experimental.ZkProgram` has been deprecated.
- `ZkProgram` gets a new input argument `name: string` which is required in the non-experimental API. The name is used to identify a ZkProgram when caching prover keys. https://github.com/o1-labs/o1js/pull/1200

### Added

- `Lightnet` namespace to interact with the account manager provided by the [lightnet Mina network](https://hub.docker.com/r/o1labs/mina-local-network) https://github.com/o1-labs/o1js/pull/1167
- Internal support for several custom gates (range check, bitwise operations, foreign field operations) and lookup tables https://github.com/o1-labs/o1js/pull/1176
- `Gadgets.rangeCheck64()`, new provable method to do efficient 64-bit range checks using lookup tables https://github.com/o1-labs/o1js/pull/1181
- `Gadgets.rotate()`, new provable method to support bitwise rotation for native field elements. https://github.com/o1-labs/o1js/pull/1182
- `Gadgets.xor()`, new provable method to support bitwise xor for native field elements. https://github.com/o1-labs/o1js/pull/1177
- `Proof.dummy()` to create dummy proofs https://github.com/o1-labs/o1js/pull/1188
  - You can use this to write ZkPrograms that handle the base case and the inductive case in the same method.

### Changed

- Use cached prover keys in `compile()` when running in Node.js https://github.com/o1-labs/o1js/pull/1187
  - Caching is configurable by passing a custom `Cache` (new export) to `compile()`
  - By default, prover keys are stored in an OS-dependent cache directory; `~/.cache/pickles` on Mac and Linux
- Use cached setup points (SRS and Lagrange bases) when running in Node.js https://github.com/o1-labs/o1js/pull/1197
  - Also, speed up SRS generation by using multiple threads
  - Together with caching of prover keys, this speeds up compilation time by roughly
    - **86%** when everything is cached
    - **34%** when nothing is cached

## [0.13.1](https://github.com/o1-labs/o1js/compare/c2f392fe5...045faa7)

### Breaking changes

- Changes to some verification keys caused by changing the way `Struct` orders object properties. https://github.com/o1-labs/o1js/pull/1124 [@Comdex](https://github.com/Comdex)
  - To recover existing verification keys and behavior, change the order of properties in your Struct definitions to be alphabetical
  - The `customObjectKeys` option is removed from `Struct`

### Changed

- Improve prover performance by ~25% https://github.com/o1-labs/o1js/pull/1092
  - Change internal representation of field elements to be JS bigint instead of Uint8Array
- Consolidate internal framework for testing equivalence of two implementations

## [0.13.0](https://github.com/o1-labs/o1js/compare/fbd4b2717...c2f392fe5)

### Breaking changes

- Changes to verification keys caused by updates to the proof system. This breaks all deployed contracts https://github.com/o1-labs/o1js/pull/1016

## [0.12.2](https://github.com/o1-labs/o1js/compare/b1d8d5910...fbd4b2717)

### Changed

- Renamed SnarkyJS to o1js https://github.com/o1-labs/o1js/pull/1104
- Reduce loading time of the library by 3-4x https://github.com/o1-labs/o1js/pull/1073
- Improve error when forgetting `transaction.prove()` https://github.com/o1-labs/o1js/pull/1095

## [0.12.1](https://github.com/o1-labs/o1js/compare/161b69d602...b1d8d5910)

### Added

- Added a method `createTestNullifier` to the Nullifier class for testing purposes. It is recommended to use mina-signer to create Nullifiers in production, since it does not leak the private key of the user. The `Nullifier.createTestNullifier` method requires the private key as an input _outside of the users wallet_. https://github.com/o1-labs/o1js/pull/1026
- Added `field.isEven` to check if a Field element is odd or even. https://github.com/o1-labs/o1js/pull/1026

### Fixed

- Revert verification key hash change from previous release to stay compatible with the current testnet https://github.com/o1-labs/o1js/pull/1032

## [0.12.0](https://github.com/o1-labs/o1js/compare/eaa39dca0...161b69d602)

### Breaking Changes

- Fix the default verification key hash that was generated for AccountUpdates. This change adopts the default mechanism provided by Mina Protocol https://github.com/o1-labs/o1js/pull/1021
  - Please be aware that this alteration results in a breaking change affecting the verification key of already deployed contracts.

## [0.11.4](https://github.com/o1-labs/o1js/compare/544489609...eaa39dca0)

### Fixed

- NodeJS error caused by invalid import https://github.com/o1-labs/o1js/issues/1012

## [0.11.3](https://github.com/o1-labs/o1js/compare/2d2af219c...544489609)

### Fixed

- Fix commonJS version of o1js, again https://github.com/o1-labs/o1js/pull/1006

## [0.11.2](https://github.com/o1-labs/o1js/compare/c549e02fa...2d2af219c)

### Fixed

- Fix commonJS version of o1js https://github.com/o1-labs/o1js/pull/1005

## [0.11.1](https://github.com/o1-labs/o1js/compare/3fbd9678e...c549e02fa)

### Breaking changes

- `Group` operations now generate a different set of constraints. This breaks deployed contracts, because the circuit changed. https://github.com/o1-labs/o1js/pull/967

### Added

- Implemented `Nullifier` as a new primitive https://github.com/o1-labs/o1js/pull/882
  - mina-signer can now be used to generate a Nullifier, which can be consumed by zkApps using the newly added Nullifier Struct

### Changed

- Improve error message `Can't evaluate prover code outside an as_prover block` https://github.com/o1-labs/o1js/pull/998

### Fixed

- Fix unsupported use of `window` when running o1js in workers https://github.com/o1-labs/o1js/pull/1002

## [0.11.0](https://github.com/o1-labs/o1js/compare/a632313a...3fbd9678e)

### Breaking changes

- Rewrite of `Provable.if()` causes breaking changes to all deployed contracts https://github.com/o1-labs/o1js/pull/889
- Remove all deprecated methods and properties on `Field` https://github.com/o1-labs/o1js/pull/902
- The `Field(x)` constructor and other Field methods no longer accept a `boolean` as input. Instead, you can now pass in a `bigint` to all Field methods. https://github.com/o1-labs/o1js/pull/902
- Remove redundant `signFeePayer()` method https://github.com/o1-labs/o1js/pull/935

### Added

- Add `field.assertNotEquals()` to assert that a field element does not equal some value https://github.com/o1-labs/o1js/pull/902
  - More efficient than `field.equals(x).assertFalse()`
- Add `scalar.toConstant()`, `scalar.toBigInt()`, `Scalar.from()`, `privateKey.toBigInt()`, `PrivateKey.fromBigInt()` https://github.com/o1-labs/o1js/pull/935
- `Poseidon.hashToGroup` enables hashing to a group https://github.com/o1-labs/o1js/pull/887

### Changed

- **Make stack traces more readable** https://github.com/o1-labs/o1js/pull/890
  - Stack traces thrown from o1js are cleaned up by filtering out unnecessary lines and other noisy details
- Remove optional `zkappKey` argument in `smartContract.init()`, and instead assert that `provedState` is false when `init()` is called https://github.com/o1-labs/o1js/pull/908
- Improve assertion error messages on `Field` methods https://github.com/o1-labs/o1js/issues/743 https://github.com/o1-labs/o1js/pull/902
- Publicly expose the internal details of the `Field` type https://github.com/o1-labs/o1js/pull/902

### Deprecated

- Utility methods on `Circuit` are deprecated in favor of the same methods on `Provable` https://github.com/o1-labs/o1js/pull/889
  - `Circuit.if()`, `Circuit.witness()`, `Circuit.log()` and others replaced by `Provable.if()`, `Provable.witness()`, `Provable.log()`
  - Under the hood, some of these methods were rewritten in TypeScript
- Deprecate `field.isZero()` https://github.com/o1-labs/o1js/pull/902

### Fixed

- Fix running o1js in Node.js on Windows https://github.com/o1-labs/o1js-bindings/pull/19 [@wizicer](https://github.com/wizicer)
- Fix error reporting from GraphQL requests https://github.com/o1-labs/o1js/pull/919
- Resolved an `Out of Memory error` experienced on iOS devices (iPhones and iPads) during the initialization of the WASM memory https://github.com/o1-labs/o1js-bindings/pull/26
- Fix `field.greaterThan()` and other comparison methods outside provable code https://github.com/o1-labs/o1js/issues/858 https://github.com/o1-labs/o1js/pull/902
- Fix `field.assertBool()` https://github.com/o1-labs/o1js/issues/469 https://github.com/o1-labs/o1js/pull/902
- Fix `Field(bigint)` where `bigint` is larger than the field modulus https://github.com/o1-labs/o1js/issues/432 https://github.com/o1-labs/o1js/pull/902
  - The new behaviour is to use the modular residual of the input
- No longer fail on missing signature in `tx.send()`. This fixes the flow of deploying a zkApp from a UI via a wallet https://github.com/o1-labs/o1js/pull/931 [@marekyggdrasil](https://github.com/marekyggdrasil)

## [0.10.1](https://github.com/o1-labs/o1js/compare/bcc666f2...a632313a)

### Changed

- Allow ZkPrograms to return their public output https://github.com/o1-labs/o1js/pull/874 https://github.com/o1-labs/o1js/pull/876
  - new option `ZkProgram({ publicOutput?: Provable<any>, ... })`; `publicOutput` has to match the _return type_ of all ZkProgram methods.
  - the `publicInput` option becomes optional; if not provided, methods no longer expect the public input as first argument
  - full usage example: https://github.com/o1-labs/o1js/blob/f95cf2903e97292df9e703b74ee1fc3825df826d/src/examples/program.ts

## [0.10.0](https://github.com/o1-labs/o1js/compare/97e393ed...bcc666f2)

### Breaking Changes

- All references to `actionsHash` are renamed to `actionState` to better mirror what is used in Mina protocol APIs https://github.com/o1-labs/o1js/pull/833
  - This change affects function parameters and returned object keys throughout the API
- No longer make `MayUseToken.InheritFromParent` the default `mayUseToken` value on the caller if one zkApp method calls another one; this removes the need to manually override `mayUseToken` in several known cases https://github.com/o1-labs/o1js/pull/863
  - Causes a breaking change to the verification key of deployed contracts that use zkApp composability

### Added

- `this.state.getAndAssertEquals()` as a shortcut for `let x = this.state.get(); this.state.assertEquals(x);` https://github.com/o1-labs/o1js/pull/863
  - also added `.getAndAssertEquals()` on `this.account` and `this.network` fields
- Support for fallback endpoints when making network requests, allowing users to provide an array of endpoints for GraphQL network requests. https://github.com/o1-labs/o1js/pull/871
  - Endpoints are fetched two at a time, and the result returned from the faster response
- `reducer.forEach(actions, ...)` as a shortcut for `reducer.reduce()` when you don't need a `state` https://github.com/o1-labs/o1js/pull/863
- New export `TokenId` which supersedes `Token.Id`; `TokenId.deriveId()` replaces `Token.Id.getId()` https://github.com/o1-labs/o1js/pull/863
- Add `Permissions.allImpossible()` for the set of permissions where nothing is allowed (more convenient than `Permissions.default()` when you want to make most actions impossible) https://github.com/o1-labs/o1js/pull/863

### Changed

- **Massive improvement of memory consumption**, thanks to a refactor of o1js' worker usage https://github.com/o1-labs/o1js/pull/872
  - Memory reduced by up to 10x; see [the PR](https://github.com/o1-labs/o1js/pull/872) for details
  - Side effect: `Circuit` API becomes async, for example `MyCircuit.prove(...)` becomes `await MyCircuit.prove(...)`
- Token APIs `this.token.{send,burn,mint}()` now accept an `AccountUpdate` or `SmartContract` as from / to input https://github.com/o1-labs/o1js/pull/863
- Improve `Transaction.toPretty()` output by adding account update labels in most methods that create account updates https://github.com/o1-labs/o1js/pull/863
- Raises the limit of actions/events per transaction from 16 to 100, providing users with the ability to submit a larger number of events/actions in a single transaction. https://github.com/o1-labs/o1js/pull/883.

### Deprecated

- Deprecate both `shutdown()` and `await isReady`, which are no longer needed https://github.com/o1-labs/o1js/pull/872

### Fixed

- `SmartContract.deploy()` now throws an error when no verification key is found https://github.com/o1-labs/o1js/pull/885
  - The old, confusing behaviour was to silently not update the verification key (but still update some permissions to "proof", breaking the zkApp)

## [0.9.8](https://github.com/o1-labs/o1js/compare/1a984089...97e393ed)

### Fixed

- Fix fetching the `access` permission on accounts https://github.com/o1-labs/o1js/pull/851
- Fix `fetchActions` https://github.com/o1-labs/o1js/pull/844 https://github.com/o1-labs/o1js/pull/854 [@Comdex](https://github.com/Comdex)
- Updated `Mina.TransactionId.isSuccess` to accurately verify zkApp transaction status after using `Mina.TransactionId.wait()`. https://github.com/o1-labs/o1js/pull/826
  - This change ensures that the function correctly checks for transaction completion and provides the expected result.

## [0.9.7](https://github.com/o1-labs/o1js/compare/0b7a9ad...1a984089)

### Added

- `smartContract.fetchActions()` and `Mina.fetchActions()`, asynchronous methods to fetch actions directly from an archive node https://github.com/o1-labs/o1js/pull/843 [@Comdex](https://github.com/Comdex)

### Changed

- `Circuit.runAndCheck()` now uses `snarky` to create a constraint system and witnesses, and check constraints. It closely matches behavior during proving and can be used to test provable code without having to create an expensive proof https://github.com/o1-labs/o1js/pull/840

### Fixed

- Fixes two issues that were temporarily reintroduced in the 0.9.6 release https://github.com/o1-labs/o1js/issues/799 https://github.com/o1-labs/o1js/issues/530

## [0.9.6](https://github.com/o1-labs/o1js/compare/21de489...0b7a9ad)

### Breaking changes

- Circuits changed due to an internal rename of "sequence events" to "actions" which included a change to some hash prefixes; this breaks all deployed contracts.
- Temporarily reintroduces 2 known issues as a result of reverting a fix necessary for network redeployment:
  - https://github.com/o1-labs/o1js/issues/799
  - https://github.com/o1-labs/o1js/issues/530
  - Please note that we plan to address these issues in a future release. In the meantime, to work around this breaking change, you can try calling `fetchAccount` for each account involved in a transaction before executing the `Mina.transaction` block.
- Improve number of constraints needed for Merkle tree hashing https://github.com/o1-labs/o1js/pull/820
  - This breaks deployed zkApps which use `MerkleWitness.calculateRoot()`, because the circuit is changed
  - You can make your existing contracts compatible again by switching to `MerkleWitness.calculateRootSlow()`, which has the old circuit
- Renamed function parameters: The `getAction` function now accepts a new object structure for its parameters. https://github.com/o1-labs/o1js/pull/828
  - The previous object keys, `fromActionHash` and `endActionHash`, have been replaced by `fromActionState` and `endActionState`.

### Added

- `zkProgram.analyzeMethods()` to obtain metadata about a ZkProgram's methods https://github.com/o1-labs/o1js/pull/829 [@maht0rz](https://github.com/maht0rz)

### Fixed

- Improved Event Handling in o1js https://github.com/o1-labs/o1js/pull/825
  - Updated the internal event type to better handle events emitted in different zkApp transactions and when multiple zkApp transactions are present within a block.
  - The internal event type now includes event data and transaction information as separate objects, allowing for more accurate information about each event and its associated transaction.
- Removed multiple best tip blocks when fetching action data https://github.com/o1-labs/o1js/pull/817
  - Implemented a temporary fix that filters out multiple best tip blocks, if they exist, while fetching actions. This fix will be removed once the related issue in the Archive-Node-API repository (https://github.com/o1-labs/Archive-Node-API/issues/7) is resolved.
- New `fromActionState` and `endActionState` parameters for fetchActions function in o1js https://github.com/o1-labs/o1js/pull/828
  - Allows fetching only necessary actions to compute the latest actions state
  - Eliminates the need to retrieve the entire actions history of a zkApp
  - Utilizes `actionStateTwo` field returned by Archive Node API as a safe starting point for deriving the most recent action hash

## [0.9.5](https://github.com/o1-labs/o1js/compare/21de489...4573252d)

- Update the zkApp verification key from within one of its own methods, via proof https://github.com/o1-labs/o1js/pull/812

### Breaking changes

- Change type of verification key returned by `SmartContract.compile()` to match `VerificationKey` https://github.com/o1-labs/o1js/pull/812

### Fixed

- Failing `Mina.transaction` on Berkeley because of unsatisfied constraints caused by dummy data before we fetched account state https://github.com/o1-labs/o1js/pull/807
  - Previously, you could work around this by calling `fetchAccount()` for every account invovled in a transaction. This is not necessary anymore.
- Update the zkApp verification key from within one of its own methods, via proof https://github.com/o1-labs/o1js/pull/812

## [0.9.4](https://github.com/o1-labs/o1js/compare/9acec55...21de489)

### Fixed

- `getActions` to handle multiple actions with multiple Account Updates https://github.com/o1-labs/o1js/pull/801

## [0.9.3](https://github.com/o1-labs/o1js/compare/1abdfb70...9acec55)

### Added

- Use `fetchEvents()` to fetch events for a specified zkApp from a GraphQL endpoint that implements [this schema](https://github.com/o1-labs/Archive-Node-API/blob/efebc9fd3cfc028f536ae2125e0d2676e2b86cd2/src/schema.ts#L1). `Mina.Network` accepts an additional endpoint which points to a GraphQL server. https://github.com/o1-labs/o1js/pull/749
  - Use the `mina` property for the Mina node.
  - Use `archive` for the archive node.
- Use `getActions` to fetch actions for a specified zkApp from a GraphQL endpoint GraphQL endpoint that implements the same schema as `fetchEvents`. https://github.com/o1-labs/o1js/pull/788

### Fixed

- Added the missing export of `Mina.TransactionId` https://github.com/o1-labs/o1js/pull/785
- Added an option to specify `tokenId` as `Field` in `fetchAccount()` https://github.com/o1-labs/o1js/pull/787 [@rpanic](https://github.com/rpanic)

## [0.9.2](https://github.com/o1-labs/o1js/compare/9c44b9c2...1abdfb70)

### Added

- `this.network.timestamp` is added back and is implemented on top of `this.network.globalSlotSinceGenesis` https://github.com/o1-labs/o1js/pull/755

### Changed

- On-chain value `globalSlot` is replaced by the clearer `currentSlot` https://github.com/o1-labs/o1js/pull/755
  - `currentSlot` refers to the slot at which the transaction _will be included in a block_.
  - the only supported method is `currentSlot.assertBetween()` because `currentSlot.get()` is impossible to implement since the value is determined in the future and `currentSlot.assertEquals()` is error-prone

### Fixed

- Incorrect counting of limit on events and actions https://github.com/o1-labs/o1js/pull/758
- Type error when using `Circuit.array` in on-chain state or events https://github.com/o1-labs/o1js/pull/758
- Bug when using `Circuit.witness` outside the prover https://github.com/o1-labs/o1js/pull/774

## [0.9.1](https://github.com/o1-labs/o1js/compare/71b6132b...9c44b9c2)

### Fixed

- Bug when using `this.<state>.get()` outside a transaction https://github.com/o1-labs/o1js/pull/754

## [0.9.0](https://github.com/o1-labs/o1js/compare/c5a36207...71b6132b)

### Added

- `Transaction.fromJSON` to recover transaction object from JSON https://github.com/o1-labs/o1js/pull/705
- New precondition: `provedState`, a boolean which is true if the entire on-chain state of this account was last modified by a proof https://github.com/o1-labs/o1js/pull/741
  - Same API as all preconditions: `this.account.provedState.assertEquals(Bool(true))`
  - Can be used to assert that the state wasn't tampered with by the zkApp developer using non-contract logic, for example, before deploying the zkApp
- New on-chain value `globalSlot`, to make assertions about the current time https://github.com/o1-labs/o1js/pull/649
  - example: `this.globalSlot.get()`, `this.globalSlot.assertBetween(lower, upper)`
  - Replaces `network.timestamp`, `network.globalSlotSinceGenesis` and `network.globalSlotSinceHardFork`. https://github.com/o1-labs/o1js/pull/560
- New permissions:
  - `access` to control whether account updates for this account can be used at all https://github.com/o1-labs/o1js/pull/500
  - `setTiming` to control who can update the account's `timing` field https://github.com/o1-labs/o1js/pull/685
  - Example: `this.permissions.set({ ...Permissions.default(), access: Permissions.proofOrSignature() })`
- Expose low-level view into the PLONK gates created by a smart contract method https://github.com/o1-labs/o1js/pull/687
  - `MyContract.analyzeMethods().<method name>.gates`

### Changed

- BREAKING CHANGE: Modify signature algorithm used by `Signature.{create,verify}` to be compatible with mina-signer https://github.com/o1-labs/o1js/pull/710
  - Signatures created with mina-signer's `client.signFields()` can now be verified inside a SNARK!
  - Breaks existing deployed smart contracts which use `Signature.verify()`
- BREAKING CHANGE: Circuits changed due to core protocol and cryptography changes; this breaks all deployed contracts.
- BREAKING CHANGE: Change structure of `Account` type which is returned by `Mina.getAccount()` https://github.com/o1-labs/o1js/pull/741
  - for example, `account.appState` -> `account.zkapp.appState`
  - full new type (exported as `Types.Account`): https://github.com/o1-labs/o1js/blob/0be70cb8ceb423976f348980e9d6238820758cc0/src/provable/gen/transaction.ts#L515
- Test accounts hard-coded in `LocalBlockchain` now have default permissions, not permissions allowing everything. Fixes some unintuitive behaviour in tests, like requiring no signature when using these accounts to send MINA https://github.com/o1-labs/o1js/issues/638

### Removed

- Preconditions `timestamp` and `globalSlotSinceHardFork` https://github.com/o1-labs/o1js/pull/560
  - `timestamp` is expected to come back as a wrapper for the new `globalSlot`

## [0.8.0](https://github.com/o1-labs/o1js/compare/d880bd6e...c5a36207)

### Added

- `this.account.<field>.set()` as a unified API to update fields on the account https://github.com/o1-labs/o1js/pull/643
  - covers `permissions`, `verificationKey`, `zkappUri`, `tokenSymbol`, `delegate`, `votingFor`
  - exists on `SmartContract.account` and `AccountUpdate.account`
- `this.sender` to get the public key of the transaction's sender https://github.com/o1-labs/o1js/pull/652
  - To get the sender outside a smart contract, there's now `Mina.sender()`
- `tx.wait()` is now implemented. It waits for the transactions inclusion in a block https://github.com/o1-labs/o1js/pull/645
  - `wait()` also now takes an optional `options` parameter to specify the polling interval or maximum attempts. `wait(options?: { maxAttempts?: number; interval?: number }): Promise<void>;`
- `Circuit.constraintSystemFromKeypair(keypair)` to inspect the circuit at a low level https://github.com/o1-labs/o1js/pull/529
  - Works with a `keypair` (prover + verifier key) generated with the `Circuit` API
- `Mina.faucet()` can now be used to programmatically fund an address on the testnet, using the faucet provided by faucet.minaprotocol.com https://github.com/o1-labs/o1js/pull/693

### Changed

- BREAKING CHANGE: Constraint changes in `sign()`, `requireSignature()` and `createSigned()` on `AccountUpdate` / `SmartContract`. _This means that smart contracts using these methods in their proofs won't be able to create valid proofs against old deployed verification keys._ https://github.com/o1-labs/o1js/pull/637
- `Mina.transaction` now takes a _public key_ as the fee payer argument (passing in a private key is deprecated) https://github.com/o1-labs/o1js/pull/652
  - Before: `Mina.transaction(privateKey, ...)`. Now: `Mina.transaction(publicKey, ...)`
  - `AccountUpdate.fundNewAccount()` now enables funding multiple accounts at once, and deprecates the `initialBalance` argument
- New option `enforceTransactionLimits` for `LocalBlockchain` (default value: `true`), to disable the enforcement of protocol transaction limits (maximum events, maximum sequence events and enforcing certain layout of `AccountUpdate`s depending on their authorization) https://github.com/o1-labs/o1js/pull/620
- Change the default `send` permissions (for sending MINA or tokens) that get set when deploying a zkApp, from `signature()` to `proof()` https://github.com/o1-labs/o1js/pull/648
- Functions for making assertions and comparisons have been renamed to their long form, instead of the initial abbreviation. Old function names have been deprecated https://github.com/o1-labs/o1js/pull/681
  - `.lt` -> `.lessThan`
  - `.lte` -> `.lessThanOrEqual`
  - `.gt` -> `.greaterThan`
  - `.gte` -> `greaterThanOrEqual`
  - `.assertLt` -> `.assertLessThan`
  - `.assertLte` -> `.assertLessThanOrEqual`
  - `.assertGt` -> `.assertGreaterThan`
  - `.assertGte` -> `assertGreaterThanOrEqual`
  - `.assertBoolean` -> `.assertBool`

### Deprecated

- `this.setPermissions()` in favor of `this.account.permissions.set()` https://github.com/o1-labs/o1js/pull/643
  - `this.tokenSymbol.set()` in favor of `this.account.tokenSymbol.set()`
  - `this.setValue()` in favor of `this.account.<field>.set()`
- `Mina.transaction(privateKey: PrivateKey, ...)` in favor of new signature `Mina.transaction(publicKey: PublicKey, ...)`
- `AccountUpdate.createSigned(privateKey: PrivateKey)` in favor of new signature `AccountUpdate.createSigned(publicKey: PublicKey)` https://github.com/o1-labs/o1js/pull/637
- `.lt`, `.lte`, `gt`, `gte`, `.assertLt`, `.assertLte`, `.assertGt`, `.assertGte` have been deprecated. https://github.com/o1-labs/o1js/pull/681

### Fixed

- Fixed Apple silicon performance issue https://github.com/o1-labs/o1js/issues/491
- Type inference for Structs with instance methods https://github.com/o1-labs/o1js/pull/567
  - also fixes `Struct.fromJSON`
- `SmartContract.fetchEvents` fixed when multiple event types existed https://github.com/o1-labs/o1js/issues/627
- Error when using reduce with a `Struct` as state type https://github.com/o1-labs/o1js/pull/689
- Fix use of stale cached accounts in `Mina.transaction` https://github.com/o1-labs/o1js/issues/430

## [0.7.3](https://github.com/o1-labs/o1js/compare/5f20f496...d880bd6e)

### Fixed

- Bug in `deploy()` when initializing a contract that already exists https://github.com/o1-labs/o1js/pull/588

### Deprecated

- `Mina.BerkeleyQANet` in favor of the clearer-named `Mina.Network` https://github.com/o1-labs/o1js/pull/588

## [0.7.2](https://github.com/o1-labs/o1js/compare/705f58d3...5f20f496)

### Added

- `MerkleMap` and `MerkleMapWitness` https://github.com/o1-labs/o1js/pull/546
- Lots of doc comments! https://github.com/o1-labs/o1js/pull/580

### Fixed

- Bug in `Circuit.log` printing account updates https://github.com/o1-labs/o1js/pull/578

## [0.7.1](https://github.com/o1-labs/o1js/compare/f0837188...705f58d3)

### Fixed

- Testnet-incompatible signatures in v0.7.0 https://github.com/o1-labs/o1js/pull/565

## [0.7.0](https://github.com/o1-labs/o1js/compare/f0837188...9a94231c)

### Added

- Added an optional string parameter to certain `assert` methods https://github.com/o1-labs/o1js/pull/470
- `Struct`, a new primitive for declaring composite, SNARK-compatible types https://github.com/o1-labs/o1js/pull/416
  - With this, we also added a way to include auxiliary, non-field element data in composite types
  - Added `VerificationKey`, which is a `Struct` with auxiliary data, to pass verification keys to a `@method`
  - BREAKING CHANGE: Change names related to circuit types: `AsFieldsAndAux<T>` -> `Provable<T>`, `AsFieldElement<T>` -> `ProvablePure<T>`, `circuitValue` -> `provable`
  - BREAKING CHANGE: Change all `ofFields` and `ofBits` methods on circuit types to `fromFields` and `fromBits`
- New option `proofsEnabled` for `LocalBlockchain` (default value: `true`), to quickly test transaction logic with proofs disabled https://github.com/o1-labs/o1js/pull/462
  - with `proofsEnabled: true`, proofs now get verified locally https://github.com/o1-labs/o1js/pull/423
- `SmartContract.approve()` to approve a tree of child account updates https://github.com/o1-labs/o1js/pull/428 https://github.com/o1-labs/o1js/pull/534
  - AccountUpdates are now valid `@method` arguments, and `approve()` is intended to be used on them when passed to a method
  - Also replaces `Experimental.accountUpdateFromCallback()`
- `Circuit.log()` to easily log Fields and other provable types inside a method, with the same API as `console.log()` https://github.com/o1-labs/o1js/pull/484
- `SmartContract.init()` is a new method on the base `SmartContract` that will be called only during the first deploy (not if you re-deploy later to upgrade the contract) https://github.com/o1-labs/o1js/pull/543
  - Overriding `init()` is the new recommended way to add custom state initialization logic.
- `transaction.toPretty()` and `accountUpdate.toPretty()` for debugging transactions by printing only the pieces that differ from default account updates https://github.com/o1-labs/o1js/pull/428
- `AccountUpdate.attachToTransaction()` for explicitly adding an account update to the current transaction. This replaces some previous behaviour where an account update got attached implicitly https://github.com/o1-labs/o1js/pull/484
- `SmartContract.requireSignature()` and `AccountUpdate.requireSignature()` as a simpler, better-named replacement for `.sign()` https://github.com/o1-labs/o1js/pull/558

### Changed

- BREAKING CHANGE: `tx.send()` is now asynchronous: old: `send(): TransactionId` new: `send(): Promise<TransactionId>` and `tx.send()` now directly waits for the network response, as opposed to `tx.send().wait()` https://github.com/o1-labs/o1js/pull/423
- Sending transactions to `LocalBlockchain` now involves
- `Circuit.witness` can now be called outside circuits, where it will just directly return the callback result https://github.com/o1-labs/o1js/pull/484
- The `FeePayerSpec`, which is used to specify properties of the transaction via `Mina.transaction()`, now has another optional parameter to specify the nonce manually. `Mina.transaction({ feePayerKey: feePayer, nonce: 1 }, () => {})` https://github.com/o1-labs/o1js/pull/497
- BREAKING CHANGE: Static methods of type `.fromString()`, `.fromNumber()` and `.fromBigInt()` on `Field`, `UInt64`, `UInt32` and `Int64` are no longer supported https://github.com/o1-labs/o1js/pull/519
  - use `Field(number | string | bigint)` and `UInt64.from(number | string | bigint)`
- Move several features out of 'experimental' https://github.com/o1-labs/o1js/pull/555
  - `Reducer` replaces `Experimental.Reducer`
  - `MerkleTree` and `MerkleWitness` replace `Experimental.{MerkleTree,MerkleWitness}`
  - In a `SmartContract`, `this.token` replaces `this.experimental.token`

### Deprecated

- `CircuitValue` deprecated in favor of `Struct` https://github.com/o1-labs/o1js/pull/416
- Static props `Field.zero`, `Field.one`, `Field.minusOne` deprecated in favor of `Field(number)` https://github.com/o1-labs/o1js/pull/524
- `SmartContract.sign()` and `AccountUpdate.sign()` in favor of `.requireSignature()` https://github.com/o1-labs/o1js/pull/558

### Fixed

- Uint comparisons and division fixed inside the prover https://github.com/o1-labs/o1js/pull/503
- Callback arguments are properly passed into method invocations https://github.com/o1-labs/o1js/pull/516
- Removed internal type `JSONValue` from public interfaces https://github.com/o1-labs/o1js/pull/536
- Returning values from a zkApp https://github.com/o1-labs/o1js/pull/461

### Fixed

- Callback arguments are properly passed into method invocations https://github.com/o1-labs/o1js/pull/516

## [0.6.1](https://github.com/o1-labs/o1js/compare/ba688523...f0837188)

### Fixed

- Proof verification on the web version https://github.com/o1-labs/o1js/pull/476

## [0.6.0](https://github.com/o1-labs/o1js/compare/f2ad423...ba688523)

### Added

- `reducer.getActions` partially implemented for local testing https://github.com/o1-labs/o1js/pull/327
- `gte` and `assertGte` methods on `UInt32`, `UInt64` https://github.com/o1-labs/o1js/pull/349
- Return sent transaction `hash` for `RemoteBlockchain` https://github.com/o1-labs/o1js/pull/399

### Changed

- BREAKING CHANGE: Rename the `Party` class to `AccountUpdate`. Also, rename other occurrences of "party" to "account update". https://github.com/o1-labs/o1js/pull/393
- BREAKING CHANGE: Don't require the account address as input to `SmartContract.compile()`, `SmartContract.digest()` and `SmartContract.analyzeMethods()` https://github.com/o1-labs/o1js/pull/406
  - This works because the address / public key is now a variable in the method circuit; it used to be a constant
- BREAKING CHANGE: Move `ZkProgram` to `Experimental.ZkProgram`

## [0.5.4](https://github.com/o1-labs/o1js/compare/3461333...f2ad423)

### Fixed

- Running o1js inside a web worker https://github.com/o1-labs/o1js/issues/378

## [0.5.3](https://github.com/o1-labs/o1js/compare/4f0dd40...3461333)

### Fixed

- Infinite loop when compiling in web version https://github.com/o1-labs/o1js/issues/379, by [@maht0rz](https://github.com/maht0rz)

## [0.5.2](https://github.com/o1-labs/o1js/compare/55c8ea0...4f0dd40)

### Fixed

- Crash of the web version introduced in 0.5.0
- Issue with `Experimental.MerkleWitness` https://github.com/o1-labs/o1js/pull/368

## [0.5.1](https://github.com/o1-labs/o1js/compare/e0192f7...55c8ea0)

### Fixed

- `fetchAccount` https://github.com/o1-labs/o1js/pull/350

## [0.5.0](https://github.com/o1-labs/o1js/compare/2375f08...e0192f7)

### Added

- **Recursive proofs**. RFC: https://github.com/o1-labs/o1js/issues/89, PRs: https://github.com/o1-labs/o1js/pull/245 https://github.com/o1-labs/o1js/pull/250 https://github.com/o1-labs/o1js/pull/261
  - Enable smart contract methods to take previous proofs as arguments, and verify them in the circuit
  - Add `ZkProgram`, a new primitive which represents a collection of circuits that produce instances of the same proof. So, it's a more general version of `SmartContract`, without any of the Mina-related API.  
    `ZkProgram` is suitable for rollup-type systems and offchain usage of Pickles + Kimchi.
- **zkApp composability** -- calling other zkApps from inside zkApps. RFC: https://github.com/o1-labs/o1js/issues/303, PRs: https://github.com/o1-labs/o1js/pull/285, https://github.com/o1-labs/o1js/pull/296, https://github.com/o1-labs/o1js/pull/294, https://github.com/o1-labs/o1js/pull/297
- **Events** support via `SmartContract.events`, `this.emitEvent`. RFC: https://github.com/o1-labs/o1js/issues/248, PR: https://github.com/o1-labs/o1js/pull/272
  - `fetchEvents` partially implemented for local testing: https://github.com/o1-labs/o1js/pull/323
- **Payments**: `this.send({ to, amount })` as an easier API for sending Mina from smart contracts https://github.com/o1-labs/o1js/pull/325
  - `Party.send()` to transfer Mina between any accounts, for example, from users to smart contracts
- `SmartContract.digest()` to quickly compute a hash of the contract's circuit. This is [used by the zkApp CLI](https://github.com/o1-labs/zkapp-cli/pull/233) to figure out whether `compile` should be re-run or a cached verification key can be used. https://github.com/o1-labs/o1js/pull/268
- `Circuit.constraintSystem()` for creating a circuit from a function, counting the number of constraints and computing a digest of the circuit https://github.com/o1-labs/o1js/pull/279
- `this.account.isNew` to assert that an account did not (or did) exist before the transaction https://github.com/MinaProtocol/mina/pull/11524
- `LocalBlockchain.setTimestamp` and other setters for network state, to test network preconditions locally https://github.com/o1-labs/o1js/pull/329
- **Experimental APIs** are now collected under the `Experimental` import, or on `this.experimental` in a smart contract.
- Custom tokens (_experimental_), via `this.token`. RFC: https://github.com/o1-labs/o1js/issues/233, PR: https://github.com/o1-labs/o1js/pull/273,
- Actions / sequence events support (_experimental_), via `Experimental.Reducer`. RFC: https://github.com/o1-labs/o1js/issues/265, PR: https://github.com/o1-labs/o1js/pull/274
- Merkle tree implementation (_experimental_) via `Experimental.MerkleTree` https://github.com/o1-labs/o1js/pull/343

### Changed

- BREAKING CHANGE: Make on-chain state consistent with other preconditions - throw an error when state is not explicitly constrained https://github.com/o1-labs/o1js/pull/267
- `CircuitValue` improvements https://github.com/o1-labs/o1js/pull/269, https://github.com/o1-labs/o1js/pull/306, https://github.com/o1-labs/o1js/pull/341
  - Added a base constructor, so overriding the constructor on classes that extend `CircuitValue` is now _optional_. When overriding, the base constructor can be called without arguments, as previously: `super()`. When not overriding, the expected arguments are all the `@prop`s on the class, in the order they were defined in: `new MyCircuitValue(prop1, prop2)`.
  - `CircuitValue.fromObject({ prop1, prop2 })` is a new, better-typed alternative for using the base constructor.
  - Fixed: the overridden constructor is now free to have any argument structure -- previously, arguments had to be the props in their declared order. I.e., the behaviour that's now used by the base constructor used to be forced on all constructors, which is no longer the case.
- `Mina.transaction` improvements
  - Support zkApp proofs when there are other account updates in the same transaction block https://github.com/o1-labs/o1js/pull/280
  - Support multiple independent zkApp proofs in one transaction block https://github.com/o1-labs/o1js/pull/296
- Add previously unimplemented preconditions, like `this.network.timestamp` https://github.com/o1-labs/o1js/pull/324 https://github.com/MinaProtocol/mina/pull/11577
- Improve error messages thrown from Wasm, by making Rust's `panic` log to the JS console https://github.com/MinaProtocol/mina/pull/11644
- Not user-facing, but essential: Smart contracts fully constrain the account updates they create, inside the circuit https://github.com/o1-labs/o1js/pull/278

### Fixed

- Fix comparisons on `UInt32` and `UInt64` (`UInt32.lt`, `UInt32.gt`, etc) https://github.com/o1-labs/o1js/issues/174, https://github.com/o1-labs/o1js/issues/101. PR: https://github.com/o1-labs/o1js/pull/307

## [0.4.3](https://github.com/o1-labs/o1js/compare/e66f08d...2375f08)

### Added

- Implement the [precondition RFC](https://github.com/o1-labs/o1js/issues/179#issuecomment-1139413831):
  - new fields `this.account` and `this.network` on both `SmartContract` and `Party`
  - `this.<account|network>.<property>.get()` to use on-chain values in a circuit, e.g. account balance or block height
  - `this.<account|network>.<property>.{assertEqual, assertBetween, assertNothing}()` to constrain what values to allow for these
- `CircuitString`, a snark-compatible string type with methods like `.append()` https://github.com/o1-labs/o1js/pull/155
- `bool.assertTrue()`, `bool.assertFalse()` as convenient aliases for existing functionality
- `Ledger.verifyPartyProof` which can check if a proof on a transaction is valid https://github.com/o1-labs/o1js/pull/208
- Memo field in APIs like `Mina.transaction` to attach arbitrary messages https://github.com/o1-labs/o1js/pull/244
- This changelog

### Changed

- Huge snark performance improvements (2-10x) for most zkApps https://github.com/MinaProtocol/mina/pull/11053
- Performance improvements in node with > 4 CPUs, for all snarks https://github.com/MinaProtocol/mina/pull/11292
- Substantial reduction of o1js' size https://github.com/MinaProtocol/mina/pull/11166

### Removed

- Unused functions `call` and `callUnproved`, which were embryonic versions of what is now the `transaction` API to call smart contract methods
- Some unimplemented fields on `SmartContract`

### Fixed

- zkApp proving on web https://github.com/o1-labs/o1js/issues/226
