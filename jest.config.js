/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: false,
  transform: {
    'src/snarky.js': 'ts-jest',
  },
};
