# How to develop SnarkyJS

This README collects information helpful for SnarkyJS core contributors.

## Run examples in Node

```sh
npm install
npm run build

./run src/examples/api_exploration.ts
```

## Build and run web version

```sh
npm install
npm run build:web
npm run serve:web
```

Then go to `http://localhost:8000/`

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
