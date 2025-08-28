export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.d.ts',
    '!src/**/index.js',
    '!src/config/env.js',
    '!src/app.js',
  ],
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
};