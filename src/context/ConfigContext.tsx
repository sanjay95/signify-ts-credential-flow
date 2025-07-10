import React, { createContext, useContext, useState } from "react";

export type ConfigEnv = "local" | "test" | "prod";

export interface Config {
  adminUrl: string;
  bootUrl: string;
  schemaServer: string;
}

const CONFIGS: Record<ConfigEnv, Config> = {
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

interface ConfigContextType {
  config: Config;
  env: ConfigEnv;
  setEnv: (env: ConfigEnv) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [env, setEnv] = useState<ConfigEnv>("test");
  const config = CONFIGS[env];
  return (
    <ConfigContext.Provider value={{ config, env, setEnv }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfigContext = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx)
    throw new Error("useConfigContext must be used within ConfigProvider");
  return ctx;
};
