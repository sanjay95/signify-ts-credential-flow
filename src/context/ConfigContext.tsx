
import React, { createContext, useContext, useState } from "react";
import { ENV_CONFIG, ConfigEnv } from "@/config/environment";

export type { ConfigEnv };

export interface Config {
  adminUrl: string;
  bootUrl: string;
  schemaServer: string;
}

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
  const config = ENV_CONFIG[env];
  
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
