/*
 * jest.config.js
 * Jest configuration for the backend: targets Node environment, discovers tests
 * under tests/, loads environment setup via tests/setup.js before any suite runs.
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/tests/setup.js'],
};
