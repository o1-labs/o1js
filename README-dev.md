# o1js README-dev

o1js is a TypeScript framework designed for zk-SNARKs and zkApps on the Mina blockchain.

- [zkApps Overview](https://docs.minaprotocol.com/zkapps)
- [Mina README](/src/mina/README.md)

For more information on our development process and how to contribute, see [CONTRIBUTING.md](https://github.com/o1-labs/o1js/blob/main/CONTRIBUTING.md). This document is meant to guide you through building o1js from source and understanding the development workflow.

It is a manual step to build the [o1js Reference docs](https://docs.minaprotocol.com/zkapps/o1js-reference). See [o1js Reference](https://github.com/o1-labs/docs2/wiki/o1js-Reference) in the docs wiki style guide.

## Prerequisites

Before starting, ensure you have the following tools installed:

- [Git](https://git-scm.com/)
- [Node.js and npm](https://nodejs.org/)
- [Dune, ocamlc, opam](https://github.com/ocaml/dune) (only needed when compiling o1js from source)
- [Cargo, rustup](https://www.rust-lang.org/learn/get-started) (only needed when compiling o1js from source)

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

This command compiles the TypeScript source files, making them ready for use. The compiled OCaml and WebAssembly artifacts are version-controlled to simplify the build process for end users. These artifacts are stored under `src/bindings/compiled` and contain the artifacts needed for both node and web builds. These files only have to be regenerated if there are changes to the OCaml or Rust source files.

## Building with nix

Much like the mina repo, we use the nix registry to conveniently handle git submodules.
You can enter the devshell with `./pin.sh` and `nix develop o1js#default` or by using
direnv with the `.envrc` provided. This devshell provides all the dependencies required for npm scripts including `npm run:update-bindings`.

## Building Bindings

To regenerate the OCaml and WebAssembly artifacts, you can do so within the o1js repo. The [bindings](https://github.com/o1-labs/o1js-bindings) and [Mina](https://github.com/MinaProtocol/mina) repos are both submodules of o1js so you can build them from within the o1js repo.

o1js depends on OCaml code that is transpiled to JavaScript using [Js_of_ocaml](https://github.com/ocsigen/js_of_ocaml) and Rust code that is transpiled to WebAssembly using [wasm-pack](https://github.com/rustwasm/wasm-pack). These artifacts allow o1js to call into [Pickles](https://github.com/MinaProtocol/mina/blob/develop/src/lib/pickles/README.md), [snarky](https://github.com/o1-labs/snarky), and [Kimchi](https://github.com/o1-labs/proof-systems) to write zk-SNARKs and zkApps.

The compiled artifacts are stored under `src/bindings/compiled` and are version-controlled to simplify the build process for end-users.

If you want to rebuild the OCaml and Rust artifacts, you must be able to build the mina repo before building the bindings. See the [Mina Dev Readme](https://github.com/MinaProtocol/mina/blob/develop/README-dev.md) for more information. After you have configured your environment to build mina, you can build the bindings:

```sh
npm run build:update-bindings
```

This command builds the OCaml and Rust artifacts and copies them to the `src/bindings/compiled` directory.

### Build Scripts

The root build script which kicks off the build process is under `src/bindings/scripts/update-o1js-bindings.sh`. This script is responsible for building the Node.js and web artifacts for o1js, and places them under `src/bindings/compiled`, to be used by o1js.

### OCaml Bindings

o1js depends on Pickles, snarky, and parts of the Mina transaction logic, all of which are compiled to JavaScript and stored as artifacts to be used by o1js natively. The OCaml bindings are located under `src/bindings`. See the [OCaml Bindings README](https://github.com/o1-labs/o1js-bindings/blob/main/README.md) for more information.

To compile the OCaml code, a build tool called Dune is used. Dune is a build system for OCaml projects, and is used in addition with Js_of_ocaml to compile the OCaml code to JavaScript. The dune file that is responsible for compiling the OCaml code is located under `src/bindings/ocaml/dune`. There are two build targets: `o1js_node` and `o1js_web`, which compile the Mina dependencies as well as link the wasm artifacts to build the Node.js and web artifacts, respectively. The output file is `o1js_node.bc.js`, which is used by o1js.

### WebAssembly Bindings

o1js additionally depends on Kimchi, which is compiled to WebAssembly. Kimchi is located in the Mina repo under `src/mina`. See the [Kimchi README](https://github.com/o1-labs/proof-systems/blob/master/README.md) for more information.

To compile the Wasm code, a combination of Cargo and Dune is used. Both build files are located under `src/mina/src/lib/crypto/kimchi`, where the `wasm` folder contains the Rust code that is compiled to Wasm, and the `js` folder that contains a wrapper around the Wasm code which allows Js_of_ocaml to compile against the Wasm backend.

For the Wasm build, the output files are:

- `plonk_wasm_bg.wasm`: The compiled WebAssembly binary.
- `plonk_wasm_bg.wasm.d.ts`: TypeScript definition files describing the types of .wasm or .js files.
- `plonk_wasm.js`: JavaScript file that wraps the Wasm code for use in Node.js.
- `plonk_wasm.d.ts`: TypeScript definition file for plonk_wasm.js.

### Generated Constant Types

In addition to building the OCaml and Rust code, the build script also generates TypeScript types for constants used in the Mina protocol. These types are generated from the OCaml source files, and are located under `src/bindings/crypto/constants.ts` and `src/bindings/mina-transaction/gen`. When building the bindings, these constants are auto-generated by Dune. If you wish to add a new constant, you can edit the `src/bindings/ocaml/o1js_constants` file, and then run `npm run build:bindings` to regenerate the TypeScript files.

o1js uses these types to ensure that the constants used in the protocol are consistent with the OCaml source files.

### Bindings check in ci

If the bindings check fails in CI it will upload a patch you can use to update the bindings without having to rebuild locally.
This can also be helpful when the bindings don't build identically, as unfortunately often happens.

To use this patch:
- Click details on the `Build o1js bindings / build-bindings-ubunutu` job
- Go to the `patch-upload` job and expand the logs for `Upload patch`
- Download the file linked in the last line of the logs ie.
`Artifact download URL: https://github.com/o1-labs/o1js/actions/runs/12401083741/artifacts/2339952965`
- unzip it
- navigate to `src/bindings`
- run `git apply path/to/bindings.patch`

## Development

### Branching Policy

| o1js base branches | Is default? |
| ------------------ | ----------- |
| main               | **Yes**     |
| develop            | No          |

When you start your work on o1js, please create the feature branch off of one of the above base branches.
It's encouraged to submit your work-in-progress as a draft PR to raise visibility!
When working with submodules and various interconnected parts of the stack, ensure you are on the correct branches that are compatible with each other.

**Default to `main` as the base branch**.

Other base branches (currently `develop` only) are used in specific scenarios where you want to adapt o1js to changes in the sibling repos on those other branches. Even then, consider whether it is feasible to land your changes to `main` and merge to `develop` afterwards. Only changes in `main` will ever be released, so anything in other branches has to be backported and reconciled with the `main` branch eventually.

#### Relationship Between Repositories and Branches

| Repository | o1js &rarr; | o1js-bindings &rarr; | mina       |
| ---------- | ----------- | -------------------- | ---------- |
| Branches   | main        | main                 | compatible |
|            | develop     | develop              | develop    |

Where:

- `compatible`: This is the [Mina repository](https://github.com/MinaProtocol/mina) branch. It corresponds to the `main` branch in both o1js and o1js-bindings repositories. This branch is where stable releases and soft-fork features are maintained.

- `develop`: This branch is maintained across all three repositories. It is used for ongoing (next hard-fork) development, testing new features and integration work.

### Running Tests

To ensure your changes don't break existing functionality, run the test suite:

```sh
npm run test
npm run test:unit
```

In order for the mina-signer tests to run you must also build from inside its subdirectory:

```sh
cd src/mina-signer
npm run build
cd ../..
```

This runs all the unit tests and provides you with a summary of the test results.

Note that you can run individual jest tests via the command:

```sh
./jest <path/to/test.ts>
```

You can also run integration tests by running:

```sh
npm run test:integration
```

Finally, a set of end-to-end tests are run against the browser. These tests are not run by default, but you can run them by running:

```sh
npm install
npm run e2e:install
npm run build:web

npm run e2e:prepare-server
npm run test:e2e
npm run e2e:show-report
```

### Run the GitHub actions locally

<!-- The test example should stay in sync with a real value set in .github/workflows/build-actions.yml -->

You can execute the CI locally by using [act](https://github.com/nektos/act). First, generate a GitHub token and use:

```sh
act -j Build-And-Test-Server --matrix test_type:"Simple integration tests" -s $GITHUB_TOKEN
```

### Releasing

To release a new version of o1js, you must first update the version number in `package.json`. Then, you can create a new pull request to merge your changes into the main branch. After the pull request is merged, a CI job automatically publishes the new version to npm.

## Testing and Debugging

### Test zkApps against Lightnet network

Use the lightweight Mina blockchain network (Lightnet) to test on a local blockchain before you test with a live network. To test zkApps against the local blockchain, first spin up Lightnet.

The easiest way is to use [zkApp CLI](https://www.npmjs.com/package/zkapp-cli) sub-commands:

```shell
zk lightnet start # start the local network
# Do your tests and other interactions with the network
zk lightnet logs # manage the logs of the local network
zk lightnet explorer # visualize the local network state
zk lightnet stop # stop the local network
```

Use `zk lightnet --help` for more information.

You can also use the corresponding [Docker image](https://hub.docker.com/r/o1labs/mina-local-network) manually:

```shell
docker run --rm --pull=missing -it \
  --env NETWORK_TYPE="single-node" \
  --env PROOF_LEVEL="none" \
  --env LOG_LEVEL="Trace" \
  -p 3085:3085 \
  -p 5432:5432 \
  -p 8080:8080 \
  -p 8181:8181 \
  -p 8282:8282 \
  o1labs/mina-local-network:compatible-latest-lightnet
```

See the [Docker Hub repository](https://hub.docker.com/r/o1labs/mina-local-network) for more information.

Next up, get the Mina blockchain accounts information to be used in your zkApp.
After the local network is up and running, you can use the [Lightnet](https://github.com/o1-labs/o1js/blob/ec789794b2067addef6b6f9c9a91c6511e07e37c/src/lib/fetch.ts#L1012) `o1js API namespace` to get the accounts information.
See the corresponding example in [src/examples/zkapps/hello-world/run-live.ts](https://github.com/o1-labs/o1js/blob/ec789794b2067addef6b6f9c9a91c6511e07e37c/src/examples/zkapps/hello-world/run-live.ts).

### Profiling o1js

To enhance the development experience and optimize the performance of o1js, use the Chrome Debugger alongside Node.js. This setup is particularly useful when you want to profile the performance of your zkApp or o1js.

#### Using the `run-debug` script

To facilitate this process, use the provided script named `run-debug`. To use this script, run:

```sh
./run-debug <path-to-your-zkapp> --bundle
```

This script initializes a Node.js process with the `--inspect-brk` flag that starts the Node.js inspector and breaks before the user script starts (i.e., it pauses execution until a debugger is attached). The `--enable-source-maps` flag ensures that source maps are used to allow easy debugging of o1js code directly.

After the Node.js process is running, open the Chrome browser and navigate to `chrome://inspect` to attach the Chrome Debugger to the Node.js process. You can set breakpoints, inspect variables, and profile the performance of your zkApp or o1js. For more information on using the Chrome Debugger, see the [DevTools documentation](https://developer.chrome.com/docs/devtools/).
