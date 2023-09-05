# o1js bindings

This repository collects code required by [o1js](https://github.com/o1-labs/o1js) to bind to lower layers of the proof system and the Mina transaction logic, which are written in Rust and OCaml.

The repo is included as a git submodule in the [o1js repo](https://github.com/o1-labs/o1js) under `src/bindings` and is typically used from there.

**Directory structure**

- `/compiled` - compiled JS and Wasm artifacts produced by `js_of_ocaml` and `wasm-bindgen` from Rust and OCaml source code. We keep these artifacts in the source tree so that developing on o1js can be done with standard JS tooling and doesn't require setting up the full OCaml/Rust build pipeline.
- `/crypto` - pure TS implementations of a subset of the crypto primitives we use, including finite field and elliptic curve arithmetic. This is used by mina-signer (a pure TS package) to hash and sign transactions.
- `/js` - JS-side wrappers for the artifacts located in `/compiled`, which differs between the Node.js and web versions of o1js. Includes code for setting up workers to support using `rayon` in Rust.
- `/kimchi` - bindings to the [Kimchi proof system](https://o1-labs.github.io/proof-systems/kimchi/overview.html) which is implemented in Rust. This contains a Wasm compatibility layer written in Rust as well as a `js_of_ocaml`-to-`wasm-bindgen` glue layer written in JS.
- `/lib` - miscellaneous low-level TypeScript, which underpins o1js and provides generic ways to connect with a proof system and blockchain protocol.
- `/mina-transaction` - TS types and modules that specialize the generic tooling in `/lib` to Mina's zkApp protocol; mostly auto-generated from OCaml.
- `/ocaml` - OCaml library exposing Snarky, Pickles and parts of the Mina transaction logic to JS. Also, OCaml scripts that help auto-generate TypeScript for Mina- and crypto-related types and constants.
- `/scripts` - scripts that build parts of o1js from their OCaml and Rust sources, including the contents of `/compiled` and other generated TS files.
- `MINA_COMMIT` - commit hash pointing to the commit of the [Mina repo](https://github.com/MinaProtocol/mina) that build artifacts in this repo where generated from.

## Building the o1js bindings

To instrument the scripts and build the o1js bindings from source, you need to work from the [Mina monorepo](https://github.com/MinaProtocol/mina).

Inside the Mina repo, you'll find the [o1js repo](https://github.com/o1-labs/o1js) as a git submodule under `src/lib/snarkyjs`. Inside `o1js`, the `o1js-bindings` repo is located at `src/bindings`. To make sure you have all nested submodules checked out, run (from the Mina root):

```sh
git submodule update --init --recursive
```

Then, switch to the o1js root in `src/lib/snarkyjs`. 

You use these two commands for different purposes:

```
npm run make
```

This command:

- Regenerates TS files in the o1js-bindings source tree
- Builds the JS/Wasm artifacts for Node.js (also contained in `/compiled/node-bindings`), but only moves them to their place in the `o1js/dist/node` folder, which is not part of the source tree.

> ℹ️ Use `npm run make` if you are developing on or testing the OCaml/Rust layers of o1js, and want to rebuild.

```
npm run bindings
```

This command:

- Does everything `npm run make` does, plus
- Builds the web version of the o1js bindings, plus
- Places the generated artifacts in the source tree under `/compiled`
- Updates the `MINA_COMMIT` file

> ℹ️ Use `npm run bindings` to update the source tree after you have finished a batch of work / a PR that touches the OCaml/Rust layers. o1js CI depends on these artifacts, so running this command is a required step before you can merge the changes.
