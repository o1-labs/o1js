<<<<<<< HEAD
# How to contribute to the SnarkyJS codebase

This README includes information that is helpful for SnarkyJS core contributors.
=======
# o1js README-dev

o1js is a TypeScript framework designed for zk-SNARKs and zkApps on the Mina blockchain.
>>>>>>> e3c20452a... feat(README-dev): first draft

- [zkApps Overview](https://docs.minaprotocol.com/zkapps)
- [Mina README](/src/mina/README.md)

For more information on our development process and how to contribute, see [CONTRIBUTING.md](https://github.com/o1-labs/o1js/blob/main/CONTRIBUTING.md). This document is meant to guide you through building o1js from source and understanding the development workflow.

## Prerequisites

Before starting, ensure you have the following tools installed:

- [Git](https://git-scm.com/)
- [Node.js and npm](https://nodejs.org/)
- [opam](https://opam.ocaml.org/)
- [Cargo](https://www.rust-lang.org/learn/get-started)

After cloning the repository, you need to fetch the submodules:

```sh
git submodule update --init --recursive
```

## Building o1js

For most users, building o1js is as simple as running:

```sh
npm install
npm run build
```

This will compile the TypeScript source files, making it ready for use. The compiled OCaml and WebAssembly artifacts are version-controlled to simplify the build process for end-users. These artifacts are stored under `src/bindings/compiled`, and contain the artifacts needed for both node and web builds. These files do not have to be regenerated unless there are changes to the OCaml or Rust source files.

## Building Bindings

If you need to regenerate the OCaml and WebAssembly artifacts, you can do so within the o1js repo. The [bindings](https://github.com/o1-labs/o1js-bindings) and [Mina](https://github.com/MinaProtocol/mina) repos are both submodules of o1js, so you can build them from within the o1js repo.

o1js depends on OCaml code that is transplied to JavaScript using [Js_of_ocaml](https://github.com/ocsigen/js_of_ocaml), and Rust code that is transpiled to WebAssembly using [wasm-pack](https://github.com/rustwasm/wasm-pack). These artifacts allow o1js to call into [Pickles](https://github.com/o1-labs/snarkyhttps://github.com/MinaProtocol/mina/blob/develop/src/lib/pickles/README.md), [snarky](https://github.com/o1-labs/snarky), and [Kimchi](https://github.com/o1-labs/proof-systems) to write zk-SNARKs and zkApps.

The compiled artifacts are stored under `src/bindings/compiled`, and are version-controlled to simplify the build process for end-users.

If you wish to rebuild the OCaml and Rust artifacts, you must be able to build the Mina repo before building the bindings. See the [Mina Dev Readme](https://github.com/MinaProtocol/mina/blob/develop/README-dev.md) for more information. Once you have configured your environment to build Mina, you can build the bindings:

```sh
npm run make
```

This will build the OCaml and Rust artifacts, and copy them to the `src/bindings/compiled` directory.

### OCaml Bindings

o1js depends on Pickles, snarky, and parts of the Mina transaction logic, all of which are compiled to JavaScript and stored as artifacts to be used by o1js natively. The OCaml bindings are located under `src/bindings`. See the [OCaml Bindings README](https://github.com/o1-labs/o1js-bindings/blob/main/README.md) for more information.

### WebAssembly Bindings

o1js additionally depends on Kimchi, which is compiled to WebAssembly. Kimchi is located in the Mina repo, under `src/mina`. See the [Kimchi README](https://github.com/o1-labs/proof-systems/blob/master/README.md) for more information.

## Development

### Branch Compatibility

When working with submodules and various interconnected parts of the stack, ensure you are on the correct branches that are compatible with each other.

#### How to Use the Branches

| Repository | mina -> o1js -> o1js-bindings    |
| ---------- | -------------------------------- |
| Branches   | o1js-main -> main -> main        |
|            | berkeley -> berkeley -> berkeley |
|            | develop -> develop -> develop    |

- `o1js-main`: The o1js-main branch in the Mina repository corresponds to the main branch in both o1js and o1js-bindings repositories. This is where stable releases and ramp-up features are maintained.

- `berkeley`: The berkeley branch is maintained across all three repositories. This branch is used for features and updates specific to the Berkeley release of the project.

<<<<<<< HEAD
SnarkyJS is mostly used to write Mina Smart Contracts and must be compatible with the latest Berkeley Testnet (or soon Mainnet). 

The OCaml code is in the snarkyjs-bindings repository, not directly in SnarkyJS. 

To maintain compatibility between the repositories and build SnarkyJS from the [Mina repository](https://github.com/MinaProtocol/mina), make changes to its core, such as the OCaml-bindings in the [snarkyjs-bindings repository](https://github.com/o1-labs/snarkyjs-bindings), you must follow a certain branch compatibility pattern:
=======
- `develop`: The develop branch is also maintained across all three repositories. It is used for ongoing development, testing new features, and integration work.

### Running Tests

To ensure your changes don't break existing functionality, run the test suite:
>>>>>>> e3c20452a... feat(README-dev): first draft

```sh
npm run test
npm run test:unit
```

<<<<<<< HEAD
| repository | mina -> snarkyjs -> snarkyjs-bindings |
| ---------- | ------------------------------------- |
| branches   | rampup -> main -> main                |
|            | berkeley -> berkeley -> berkeley      |
|            | develop -> develop -> develop         |
=======
This will run all the unit tests and provide you with a summary of the test results.
>>>>>>> e3c20452a... feat(README-dev): first draft

You can additionally run integration tests by running:

```sh
npm run test:integration
```

Finally, we have a set of end-to-end tests that run against the browser. These tests are not run by default, but you can run them by running:

```sh
npm install
npm run e2e:install
npm run build:web

npm run e2e:prepare-server
npm run test:e2e
npm run e2e:show-report
```

### Releasing

To release a new version of o1js, you must first update the version number in `package.json`. Then, you can create a new pull request to merge your changes into the main branch. Once the pull request is merged, a CI job will automatically publish the new version to npm.
