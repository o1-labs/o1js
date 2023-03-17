# How to contribute to the SnarkyJS codebase

This README includes information that is helpful for SnarkyJS core contributors.

## Run examples using NodeJS

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

To see the test running in a web browser, go to `http://localhost:8000/`

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
