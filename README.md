# SnarkyJS

To write a Snapp, we recommend using the [Snapp CLI](https://github.com/o1-labs/snapp-cli), which makes writing a Snapp easy by including SnarkyJS & providing project scaffolding, a test framework, and formatting.

SnarkyJS's documentation is available [here](https://o1-labs.github.io/snarkyjs/).

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
