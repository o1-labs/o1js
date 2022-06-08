# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/o1-labs/snarkyjs/compare/e66f08d0694309c624c2543f010cd89cac40c77a...HEAD)

### Added

- Implement the [precondition RFC](https://github.com/o1-labs/snarkyjs/issues/179#issuecomment-1139413831):
  - new fields `this.account` and `this.network` on both `SmartContract` and `Party`
  - `this.<account|network>.<property>.get()` to use on-chain values in a circuit, e.g. account balance or block height
  - `this.<account|network>.<property>.{assertEqual, assertBetween, assertNothing}()` to constrain what values to allow for these
- `Bool.true`, `Bool.false` and `bool.assertTrue()`, `bool.assertFalse()` as convenient aliases for existing functionality
- `Ledger.verifyPartyProof` which can check if a proof on a transaction is valid https://github.com/o1-labs/snarkyjs/pull/208
- This changelog

### Changed

- Huge snark performance improvements (2-10x) for most zkApps https://github.com/MinaProtocol/mina/pull/11053
- Substantial reduction of snarkyjs' size https://github.com/MinaProtocol/mina/pull/11166

<!--
  Possible subsections:
    Added for new features.
    Changed for changes in existing functionality.
    Deprecated for soon-to-be removed features.
    Removed for now removed features.
    Fixed for any bug fixes.
    Security in case of vulnerabilities.
 -->
