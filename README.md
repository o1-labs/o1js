# SnarkyJS

To write a zkApp, we recommend using the [zkApp CLI](https://github.com/o1-labs/zkapp-cli), which makes writing a zkApp easy by including SnarkyJS & providing project scaffolding, a test framework, and formatting.

SnarkyJS's documentation is available [here](https://docs.minaprotocol.com/en/zkapps/snarkyjs-reference).

See [CHANGELOG.md](https://github.com/o1-labs/snarkyjs/blob/main/CHANGELOG.md) for a list of changes between versions.

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

## Contributing

We appreciate any community contributions to SnarkyJS! Below are some steps that will help you get your changes in main as quickly as possible.

1. Create a new issue for your proposed changes (or use an existing issue if a relevant one exists).
2. Write an RFC in your issue outlining your proposed changes and motivation. [Example](https://github.com/o1-labs/snarkyjs/issues/233) Note: if you are proposing a smaller change your RFC will be smaller, and that's ok! :)
3. One of the maintainers will review your RFC and work with you until it is approved.
4. Fork the repository and implement your changes.
5. Submit pull request and wait for code review :)
