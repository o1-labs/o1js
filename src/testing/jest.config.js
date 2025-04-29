export default {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/', 'dist/node/'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
