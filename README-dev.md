# How to contribute to the o1js codebase

This README includes information that is helpful for o1js core contributors.

## Setting up the repo on your local

After cloning the repo, you must fetch external submodules for the following examples to work.

```shell
git clone https://github.com/o1-labs/o1js.git
cd o1js
git submodule update --init --recursive
```

## Run examples using Node.js

```shell
npm install
npm run build

./run src/examples/api_exploration.ts
```

## Run examples in the browser

```shell
npm install
npm run build:web

./run-in-browser.js src/examples/api_exploration.ts
```

To see the test running in a web browser, go to `http://localhost:8000/`.

Note: Some of our examples don't work on the web because they use Node.js APIs.

## Run tests

- Unit tests

  ```shell
  npm run test
  npm run test:unit
  ```

- Integration tests

  ```shell
  npm run test:integration
  ```

- E2E tests

  ```shell
  npm install
  npm run e2e:install
  npm run build:web

  npm run e2e:prepare-server
  npm run test:e2e
  npm run e2e:show-report
  ```

## Branch Compatibility

o1js is mostly used to write Mina Smart Contracts and must be compatible with the latest Berkeley Testnet, or soon Mainnet.

The OCaml code is in the o1js-bindings repository, not directly in o1js.

To maintain compatibility between the repositories and build o1js from the [Mina repository](https://github.com/MinaProtocol/mina), make changes to its core, such as the OCaml-bindings in the [o1js-bindings repository](https://github.com/o1-labs/o1js-bindings), you must follow a certain branch compatibility pattern:

The following branches are compatible:

| repository | mina -> o1js -> o1js-bindings    |
| ---------- | -------------------------------- |
| branches   | o1js-main -> main -> main        |
|            | berkeley -> berkeley -> berkeley |
|            | develop -> develop -> develop    |

If you work on o1js, create a feature branch off of one of these base branches. It's encouraged to submit your work-in-progress as a draft PR to raise visibility!

**Default to `main` as the base branch**.

The other base branches (`berkeley`, `develop`) are only used in specific scenarios where you want to adapt o1js to changes in the sibling repos on those other branches. Even then, consider whether it is feasible to land your changes to `main` and merge to `berkeley` and `develop` afterwards. Only changes in `main` will ever be released, so anything in the other branches has to be backported and reconciled with `main` eventually.

## Run the GitHub actions locally

<!-- The test example should stay in sync with a real value set in .github/workflows/build-actions.yml -->

You can execute the CI locally by using [act](https://github.com/nektos/act). First generate a GitHub token and use:

```shell
act -j Build-And-Test-Server --matrix test_type:"Simple integration tests" -s $GITHUB_TOKEN
```

to execute the job "Build-And-Test-Server for the test type `Simple integration tests`.

## Test zkApps against the local blockchain network

In order to be able to test zkApps against the local blockchain network, you need to spin up such a network first.  
You can do so in several ways.

1. Using [zkapp-cli](https://www.npmjs.com/package/zkapp-cli)'s sub commands:

   ```shell
   zk lightnet start # start the local network
   # Do your tests and other interactions with the network
   zk lightnet logs # manage the logs of the local network
   zk lightnet explorer # visualize the local network state
   zk lightnet stop # stop the local network
   ```

   Please refer to `zk lightnet --help` for more information.

2. Using the corresponding [Docker image](https://hub.docker.com/r/o1labs/mina-local-network) manually:

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
     o1labs/mina-local-network:o1js-main-latest-lightnet
   ```

   Please refer to the [Docker Hub repository](https://hub.docker.com/r/o1labs/mina-local-network) for more information.

Next up, you will need the Mina blockchain accounts information in order to be used in your zkApp.  
Once the local network is up and running, you can use the [Lightnet](https://github.com/o1-labs/o1js/blob/ec789794b2067addef6b6f9c9a91c6511e07e37c/src/lib/fetch.ts#L1012) `o1js API namespace` to get the accounts information.  
The corresponding example can be found here: [src/examples/zkapps/hello_world/run_live.ts](https://github.com/o1-labs/o1js/blob/ec789794b2067addef6b6f9c9a91c6511e07e37c/src/examples/zkapps/hello_world/run_live.ts)
