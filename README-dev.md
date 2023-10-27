# How to contribute to the SnarkyJS codebase

This README includes information that is helpful for SnarkyJS core contributors.

## Run examples using Node.js

```sh
npm install
npm run build

./run src/examples/api_exploration.ts
```

## Build and run the web version

```sh
npm run build:bindings
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

SnarkyJS is mostly used to write Mina Smart Contracts and must be compatible with the latest Berkeley Testnet (or soon Mainnet).

The OCaml code is in the snarkyjs-bindings repository, not directly in SnarkyJS.

To maintain compatibility between the repositories and build SnarkyJS from the [Mina repository](https://github.com/MinaProtocol/mina), make changes to its core, such as the OCaml-bindings in the [snarkyjs-bindings repository](https://github.com/o1-labs/snarkyjs-bindings), you must follow a certain branch compatibility pattern:

The following branches are compatible:

| repository | mina -> snarkyjs -> snarkyjs-bindings |
| ---------- | ------------------------------------- |
| branches   | rampup -> main -> main                |
|            | berkeley -> berkeley -> berkeley      |
|            | develop -> develop -> develop         |
