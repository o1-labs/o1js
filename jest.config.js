export default {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/', 'dist/node/'],
  modulePathIgnorePatterns: ['src/mina/'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testTimeout: 1_000_000,
};
