# Contributing guidelines

Thank you for investing your time in contributing to our project.

We also welcome contributions to [zkApps Developer](https://docs.minaprotocol.com/zkapps) documentation.

There are two ways to contribute:

1. Maintain your own package that the community can install in addition to SnarkyJS
2. Directly contribute to this repo

If you maintain your own package, we strongly encourage to add it to our [official list of community packages](./README.md#community-packages).

For information that is helpful for SnarkyJS core contributors, see [README-dev](README-dev.md).

### Creating high-quality community packages

Quality guidelines make it easier for us to review and approve your package so it can be added to the official list. 

Follow these guidelines to create a high-quality package: 

- The package is published to [npm](https://www.npmjs.com/)
  - `npm install <your-package>` works and is all that is needed to use the package
  - SnarkyJS must be listed as a [peer dependency](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#peerdependencies)
  - If applicable, the package must work both on the web and in a node
- _Recommended_: The package is created using the [zkApp CLI](https://github.com/o1-labs/zkapp-cli) for code consistency.  
  If you did not create the package using the zkApp CLI, follow these minimum guidelines:
  - Use TypeScript to export types from `d.ts` files
  - Code must be auto-formatted with [prettier](https://prettier.io/)
- The package includes tests
  - If applicable, tests must demonstrate that the package's methods can successfully run as provable code. For example, when the package is included in a SmartContract or ZkProgram that is compiled and proven
- Public API must be documented and [JSDoc](https://jsdoc.app/) comments must be present on exported methods and globals
- Include README and LICENSE files
- Comments and README must be in English and preferably use American spelling

### Contributing to SnarkyJS core

The `main` branch contains the development version of the code. 

To contribute directly to this project repo, follow these steps to get your changes in the `main` branch as quickly as possible.

1. Create a new issue for your proposed changes or use an existing issue if a relevant one exists.
2. Write a request for change (RFC) to outline your proposed changes and motivation, like this [example RFC](https://github.com/o1-labs/snarkyjs/issues/233). Note: If you are proposing a smaller change your RFC will be smaller, and that's ok! :)
3. One of the codebase maintainers reviews your RFC and works with you until it is approved.
4. After your RFC proposal is approved, fork the repository and implement your changes.
5. Submit a pull request and wait for code review. :)

We appreciate your contribution!
