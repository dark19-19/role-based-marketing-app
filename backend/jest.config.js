module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/unitTest/**/*.js'],
  maxWorkers: 1,
  setupFiles: ['<rootDir>/test/jest.env.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.js'],
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
};
