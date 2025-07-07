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
- [gh](https://cli.github.com/) (used to download artifacts)
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
gh auth login #gh is used to download the compiled artifacts
npm run build
```

This command downloads the artifacts from GitHub if they are missing and compiles the TypeScript source files, making them ready for use.
The compiled OCaml and WebAssembly artifacts are cached for each commit where ci is run.These artifacts are stored under `src/bindings/compiled` and `src/bindings/mina-transaction/gen` and contain the artifacts needed for both nodejs and web builds.
These files only have to be regenerated if there are changes to the OCaml or Rust source files.

### External contributors

Unfortunately you generally won't be able to run `npm run build:bindings-download` on your own commits
because the artifacts won't have been built for them, so make sure to run it on main before you start making changes.
In a fresh git repo `npm run build` also works.

Keep in mind that merging a newer version of o1js may include OCaml and Rust changes so you may need to redownload the artifacts.
When this happens, as long as you aren't making changes to the OCaml and Rust yourself,
you can run `REV=<commit you just merged> npm run build:bindings-download`, this will download the bindings for the commit you merged which should be the same as the ones you need.

### Internal contributors

If you have an open pr `npm run build:bindings-download` should work on any commit where ci has run or is running.
If ci is still running it uses `gh run watch` to show you the progress.

If your pr has a merge conflict, in which case CI will not run on each new commit, or you
just don't have a pr you may can run `npm run build:bindings-remote`.
This will trigger our self-hosted runner to build the bindings for your commit and download them once it finishes.

## Building with nix

Much like the mina repo, we use the nix registry to conveniently handle git submodules.
You can enter the devshell with `./pin.sh` and `nix develop o1js#default` or by using
direnv with the `.envrc` provided. This devshell provides all the dependencies required for npm scripts including `npm run build:update-bindings`.

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

| Repository | o1js &rarr; | mina       |
| ---------- | ----------- | ---------- |
| Branches   | main        | compatible |
|            | develop     | develop    |

Where:

- `compatible`: This is the [Mina repository](https://github.com/MinaProtocol/mina) branch. It corresponds to the `main` branch in o1js. This branch is where stable releases and soft-fork features are maintained.

- `develop`: This branch is maintained across all three repositories. It is used for ongoing (next hard-fork) development, testing new features and integration work.

### Style Guide

This repo uses minimal [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and [prettier](https://prettier.io/docs/) configs to stay tidy. Here are some tips to comply with the style:

1. Check for style violations by running the npm commands `npm run lint path/to/file` and `npm run format:check path/to/file`

- To attempt to fix all style violations in all changed files, you can run:
  - `git diff --cached --name-only --diff-filter=d | grep -E '\.(ts|js)$' | xargs npm run format`
  - and `git diff --cached --name-only --diff-filter=d | grep -E '\.(ts|js)$' | xargs npm run lint:fix`

2. Integrate prettier into your dev environment

- For instance the [VS Code](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) plugin allows for format on save

3. Enable pre-commit hooks

- There is an opt-in pre-commit hook available that will attempt to fix styling for all diffed files. Enable it by running `git config husky.optin true`

> [!NOTE]
> You can opt-out of linting in a PR by tagging it with skip-lint, in case the linting script is legitimately blocking an important PR

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

### Debugging within the SDK

To debug a call into the SDK, you can link your local copy of the SDK with `npm link`. After that, you'll be able to add log statements, set breakpoints, and make code changes. Within the SDK, run:

```sh
npm run link
```

Then in your zkApp codebase, run:

```sh
npm link o1js
```

#### Logging from OCaml

If you need to debug a call into the OCaml code, the process is a little more complicated. The OCaml is compiled into JavaScript with js_of_ocaml during `npm run build:update-bindings`, so you'll need to add your logs into the OCaml code and rebuild the bindings to see them. Logging from OCaml in a way that will reflect as JS `console.log`s in the compiled code can be done like this:

```ocaml
let () = print_endline "This is a log" in
```
