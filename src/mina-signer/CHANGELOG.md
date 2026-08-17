# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
  Possible subsections:
    _Added_ for new features.
    _Changed_ for changes in existing functionality.
    _Deprecated_ for soon-to-be removed features.
    _Removed_ for now removed features.
    _Fixed_ for any bug fixes.
    _Security_ in case of vulnerabilities.
 -->

## [Unreleased](https://github.com/o1-labs/o1js/compare/44ba2f4d5...HEAD)

## [4.1.0](https://github.com/o1-labs/o1js/compare/e99c57f63...44ba2f4d5) - 2026-07-13

### Added

- New `era` option on the `Client` constructor
  (`new Client({ network, era: 'berkeley' })`) for signing/verifying zkApp
  commands in the legacy berkeley (o1js v2.9.0) transaction format. Defaults to
  `'mesa'` (current format); `era` is orthogonal to `network`. Legacy
  payment/delegation/string/field signing is unchanged across eras.
  https://github.com/o1-labs/o1js/pull/2892
- `Client.getZkappCommandCommitments` and
  `Client.getZkappCommandCommitmentsFromJSON` for computing the commitment and
  full commitment of a zkApp transaction.
  https://github.com/o1-labs/o1js/pull/2869

## [4.0.0](https://github.com/o1-labs/o1js/compare/f54dd40...e99c57f63) - 2026-04-20

### Breaking changes

- zkApp commands are now signed and verified in the **Mesa** transaction format,
  matching the Mesa hard fork of the Mina protocol. Signatures over zkApp
  commands produced by mina-signer 3.x are not compatible with Mesa networks.
  Legacy payment/delegation/string/field signing is unchanged.
  https://github.com/o1-labs/o1js/pull/2846

## [3.1.0](https://github.com/o1-labs/o1js/compare/e3e758b...f54dd40) - 2025-09-09

### Added

- Allow signing zkApp command without fee payer private key
  https://github.com/o1-labs/o1js/pull/2417
