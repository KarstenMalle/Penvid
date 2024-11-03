module.exports = {
  preset: 'ts-jest', // Use ts-jest to handle TypeScript and JSX
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Map @/ to the src directory
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // Use ts-jest to handle TypeScript files
  },
}
