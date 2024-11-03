module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest', // Use babel-jest for TypeScript and JSX files
  },
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Map @/ to the src directory
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock out CSS imports
  },
}
