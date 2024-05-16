# Contributing guidelines

Thank you for investing your time in contributing to our project.

We also welcome contributions to [zkApps Developer](https://docs.minaprotocol.com/zkapps) documentation.

There are two ways to contribute:

1. Preferred: Maintain your own package that can be installed from [npm](https://www.npmjs.com/) and used alongside o1js. See [Creating high-quality community packages](#creating-high-quality-community-packages).
2. Directly contribute to this repo. See [Contributing to o1js](#contributing-to-o1js).

If you maintain your own package, we strongly encourage you to add it to our official list of [community packages](./README.md#community-packages).

For information that is helpful for o1js core contributors, see [README-dev](README-dev.md).

### Creating high-quality community packages

To ensure consistency within the o1js ecosystem and ease review and use by our team and other o1js devs, we encourage community packages to follow these standards:

- The package is published to [npm](https://www.npmjs.com/).
  - `npm install <your-package>` works and is all that is needed to use the package.
  - o1js must be listed as a [peer dependency](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#peerdependencies).
  - If applicable, the package must work both on the web and in NodeJS.
- The package is created using the [zkApp CLI](https://www.npmjs.com/package/zkapp-cli) (recommended).  
  If you did not create the package using the zkApp CLI, follow these guidelines for code consistency:
  - Use TypeScript, and export types from `d.ts` files. We suggest that you base your tsconfig on the [tsconfig.json](./tsconfig.json) that o1js uses.
  - Code must be auto-formatted with [prettier](https://prettier.io/). We encourage you to use [.prettierrc.cjs](./.prettierrc.cjs), the same prettier config as o1js.
- The package includes tests.
  - If applicable, tests must demonstrate that the package's methods can successfully run as provable code. For example, when the package is used in a SmartContract or ZkProgram that is compiled and proven.
  - Ideally, your tests are easy to use, modify, and port to other projects by developers in the ecosystem. This is achieved by using Jest (see [jest.config.js](./jest.config.js) for an example config) or by structuring your tests as plain node scripts, like [this example](./src/lib/circuit_value.unit-test.ts).
- Public API must be documented and [JSDoc](https://jsdoc.app/) comments must be present on exported methods and globals.
- Include README and LICENSE files.
- Comments and README must be in English and preferably use American spelling.

### Contributing to o1js

The `main` branch contains the development version of the code.

To contribute directly to this project repo, follow these steps to get your changes in the `main` branch as quickly as possible.

1. Create a new issue for your proposed changes or use an existing issue if a relevant one exists.
1. Write a request for comment (RFC) to outline your proposed changes and motivation, like this [example RFC](https://github.com/o1-labs/o1js/issues/233). Describe your objective and why the change is useful, how it works, and so on.

   Note: If you are proposing a smaller change your RFC will be smaller, and that's ok! :)

1. One of the codebase maintainers reviews your RFC and works with you until it is approved.
1. After your RFC proposal is approved, fork the repository and implement your changes.
1. Submit a pull request and wait for code review. :)

Our goal is to include functionality within o1js when the change is likely to be widely useful for developers. For more esoteric functionality, it makes more sense to provide high-quality community packages that can be used alongside o1js.

We appreciate your contribution!
