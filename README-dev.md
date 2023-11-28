# How to contribute to the o1js codebase

This README includes information that is helpful for o1js core contributors.

## Run examples using Node.js

```sh
npm install
npm run build

./run src/examples/api_exploration.ts
```

## Run examples in the browser

```sh
npm install
npm run build:web

./run-in-browser.js src/examples/api_exploration.ts
```

To see the test running in a web browser, go to `http://localhost:8000/`.

Note: Some of our examples don't work on the web because they use Node.js APIs.

## Run tests

- Unit tests

  ```sh
  npm run test
  npm run test:unit
  ```

- Integration tests

  ```sh
  npm run test:integration
  ```

- E2E tests

  ```sh
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

## Run the GitHub actions locally

<!-- The test example should stay in sync with a real value set in .github/workflows/build-actions.yml -->

You can execute the CI locally by using [act](https://github.com/nektos/act). First generate a GitHub token and use:

```
act -j Build-And-Test-Server --matrix test_type:"Simple integration tests" -s $GITHUB_TOKEN
```

to execute the job "Build-And-Test-Server for the test type `Simple integration tests`.
