# SnarkyJS &nbsp; [![npm version](https://img.shields.io/npm/v/snarkyjs.svg?style=flat)](https://www.npmjs.com/package/snarkyjs) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

To write a zkApp, we recommend using the [zkApp CLI](https://github.com/o1-labs/zkapp-cli), which makes writing a zkApp easy by including SnarkyJS & providing project scaffolding, a test framework, and formatting.

SnarkyJS's documentation is available [here](https://docs.minaprotocol.com/en/zkapps/snarkyjs-reference).

See [CHANGELOG.md](https://github.com/o1-labs/snarkyjs/blob/main/CHANGELOG.md) for a list of changes between versions.

## Community packages

> An initial list of community-maintained packages will be put together soon. If you want your package to appear on it, see [the next section](#contributing)

## Contributing

We appreciate any community contributions to SnarkyJS! There are two ways to contribute:

1. Maintain your own package, which people can install in addition to SnarkyJS
2. Contribute to this repo directly

If you maintain your own package, we highly encourage to add it to our [official list of community packages](#community-packages). The process is as follows:

- You open a PR which adds your package to the [list](#community-packages).
- We review your package and decide if it fits our [quality criteria](#creating-high-quality-community-packages).
- If yes, the PR is merged and your package appears on the list

### Creating high-quality community packages

Here are some guidelines for what constitutes a high-quality package and makes it easier for us to review and add to the official list:

- The package is published to [npm](https://www.npmjs.com/)
  - `npm install <your-package>` works and is all that is needed to use the package
  - SnarkyJS should be listed as a [peer dependency](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#peerdependencies)
  - If applicable: the package should work both on the web and in node
- _Recommended_: the package is created using the [zkApp CLI](https://github.com/o1-labs/zkapp-cli) for code consistency.  
  If not using the CLI, follow these minimal recommendations:
  - Use TypeScript, and export types from `d.ts` files
  - Code should be auto-formatted with [prettier](https://prettier.io/)
- The package includes tests
  - If applicable, tests should demonstrate that the package's methods can successfully run as provable code, i.e., when included in a SmartContract or ZkProgram that is compiled and proven.
- Public API should be documented, and [JSDoc](https://jsdoc.app/) comments should be present on exported methods and globals
- Include a README and LICENSE
- Comments & README should be in English, American spelling preferred, for consistency.

### Contributing to SnarkyJS core

If you want to contribute to this repo directly, below are some steps that will help you get your changes in main as quickly as possible.

1. Create a new issue for your proposed changes (or use an existing issue if a relevant one exists).
2. Write an RFC in your issue outlining your proposed changes and motivation. [Example](https://github.com/o1-labs/snarkyjs/issues/233) Note: if you are proposing a smaller change your RFC will be smaller, and that's ok! :)
3. One of the maintainers will review your RFC and work with you until it is approved.
4. Fork the repository and implement your changes.
5. Submit pull request and wait for code review :)
