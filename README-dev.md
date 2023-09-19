# How to contribute to the o1js codebase

This README includes information that is helpful for o1js core contributors.

## Run examples using Node.js

```sh
npm install
npm run build

./run src/examples/api_exploration.ts
```

## Build and run the web version

```sh
npm install
npm run build:web
npm run serve:web
```

To see the test running in a web browser, go to `http://localhost:8000/`.

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

| repository | mina -> o1js -> o1js-bindings |
| ---------- | ------------------------------------- |
| branches   | rampup -> main -> main                |
|            | berkeley -> berkeley -> berkeley      |
|            | develop -> develop -> develop         |
