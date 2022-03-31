# SnarkyJS

To write a zkApp, we recommend using the [zkApp CLI](https://github.com/o1-labs/zkapp-cli), which makes writing a zkApp easy by including SnarkyJS & providing project scaffolding, a test framework, and formatting.

SnarkyJS's documentation is available [here](https://docs.minaprotocol.com/en/zkapps/snarkyjs-reference).

## Run examples in Node

```
npm install
npm run build

./run src/examples/api_exploration.ts
```

## Build and run web version

```
npm install
npm run start:web
```

Then go to `http://localhost:8000/`

## Run tests

```
npm run test
```

## Publish

```bash
# Make sure to have proper NPM credentials before publishing.
# To get credentials, use `npm login`
npm publish
```
