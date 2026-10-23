# Security Policy

## Reporting a Vulnerability

Please do **not** open a public issue, pull request, or discussion for a
suspected security vulnerability.

Instead, report it privately through
[GitHub's private vulnerability reporting](https://github.com/o1-labs/o1js/security/advisories/new)
for this repository. This lets us investigate, prepare a fix, and coordinate
disclosure with you before any details become public.

Please include, as far as you can:

- a description of the issue and its impact,
- the affected versions, commits, or code locations,
- a proof of concept or reproduction steps,
- any suggested fix, if you have one.

We will acknowledge your report, keep you updated while we investigate, and
agree on a disclosure timeline with you. With your permission, we will credit
you publicly when the fix is released (see Acknowledgements below).

## Supported Versions

Security fixes are applied to `main` and the latest published release of `o1js`
on npm. Older releases may not receive patches, so please upgrade to the latest
version.

## Acknowledgements

We thank the security researchers who have responsibly disclosed vulnerabilities
in o1js:

- **Dan ([@auditinfra-io](https://github.com/auditinfra-io))** — reported a
  missing bounds constraint in `DynamicArray.get()` / `.set()` after a length
  change (a soundness issue), together with four related correctness defects in
  `src/lib/provable/dynamic-array.ts`, including a full proof of concept and a
  suggested fix.
