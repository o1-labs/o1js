# o1js bindings

**Directory structure**

- `/compiled` - compiled JS and Wasm artifacts produced by `js_of_ocaml` and `wasm-bindgen` from Rust and OCaml source code. We keep these artifacts in the source tree so that developing on o1js can be done with standard JS tooling and doesn't require setting up the full OCaml/Rust build pipeline.
- `/crypto` - pure TS implementations of a subset of the crypto primitives we use, including finite field and elliptic curve arithmetic. This is used by mina-signer (a pure TS package) to hash and sign transactions.
- `/js` - JS-side wrappers for the artifacts located in `/compiled`, which differs between the Node.js and web versions of o1js. Includes code for setting up workers to support using `rayon` in Rust.
- `/lib` - miscellaneous low-level TypeScript, which underpins o1js and provides generic ways to connect with a proof system and blockchain protocol.
- `/mina-transaction` - TS types and modules that specialize the generic tooling in `/lib` to Mina's zkApp protocol; mostly auto-generated from OCaml.
- `/ocaml` - OCaml library exposing Snarky, Pickles and parts of the Mina transaction logic to JS. Also, OCaml scripts that help auto-generate TypeScript for Mina- and crypto-related types and constants.
- `/scripts` - scripts that build parts of o1js from their OCaml and Rust sources, including the contents of `/compiled` and other generated TS files.
- `MINA_COMMIT` - commit hash pointing to the commit of the [Mina repo](https://github.com/MinaProtocol/mina) that build artifacts in this repo where generated from.

## Building the o1js bindings

The bindings can be built with
`npm run build:update-bindings`
`nix run o1js#update-bindings`
or even
`./scripts/update-o1js-bindings.sh`
