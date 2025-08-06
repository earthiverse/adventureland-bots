/** @type {import('ts-jest').JestConfigWithTsJest} **/

export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.jest.json", useESM: true }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js": "$1",
  },
  silent: true, // Hide console logs
};
