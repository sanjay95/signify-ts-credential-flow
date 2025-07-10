
// Environment configuration
export const ENV_CONFIG = {
  local: {
    adminUrl: "http://localhost:3901",
    bootUrl: "http://localhost:3903",
    schemaServer: "http://localhost:7723",
  },
  test: {
    adminUrl: "https://keria.testnet.gleif.org:3901",
    bootUrl: "https://keria.testnet.gleif.org:3903",
    schemaServer: "https://schema.testnet.gleif.org:7723",
  },
  prod: {
    adminUrl: "https://keria.prod.gleif.org:3901",
    bootUrl: "https://keria.prod.gleif.org:3903",
    schemaServer: "https://schema.prod.gleif.org:7723",
  },
};

// Fixed passcodes for specific account types
export const FIXED_PASSCODES = {
  GLEIF: "0123456789abcdefghijk", // GLEIF root passcode
};

// Placeholder LEI values for testing
export const PLACEHOLDER_LEIS = {
  sampleLE1: "213800WAVVOPS85N2205",
  sampleLE2: "5493001KJTIIGC8Y1R12",
  sampleQVI1: "254900OPPU84GM83MG36",
  sampleQVI2: "549300E9PC51EN656077",
};

export type ConfigEnv = keyof typeof ENV_CONFIG;
