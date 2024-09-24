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

<!-->

Showing all changes since the last release (v.1.5.0)
-->

## [Unreleased](https://github.com/o1-labs/o1js/compare/1c736add...v2) - 2024-07-12

### Breaking Changes

- The `divMod32()` gadget was modified to accept `nBits` instead of `quotientBits`, and assert it is in the range [0, 2**255) to address an issue previoulsy where the bound on `quotientBits` was too low https://github.com/o1-labs/o1js/pull/1763.

- `Provable.equal()` now turns both types into canonical form before comparing them https://github.com/o1-labs/o1js/pull/1759
  - Removed implicit version `Provable.equal(x, y)` where you didn't have to pass in the type

### Added

- New method `toCanonical()` in the `Provable<T>` interface to protect against incompleteness of certain operations on malicious witness inputs https://github.com/o1-labs/o1js/pull/1759
