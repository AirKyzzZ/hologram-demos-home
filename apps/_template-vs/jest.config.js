/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { rootDir: '.' } }] },
  collectCoverageFrom: ['**/*.ts', '!main.ts', '!**/*.module.ts', '!**/__tests__/**', '!**/*.spec.ts'],
  coverageDirectory: '../coverage',
  moduleFileExtensions: ['ts', 'js', 'json'],
}
