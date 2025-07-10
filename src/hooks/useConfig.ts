import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface Config {
  adminUrl: string;
  bootUrl: string;
  schemaServer;
}

const DEFAULT_CONFIG: Config = {
  adminUrl: "https://keria.testnet.gleif.org:3901",
  bootUrl: "https://keria.testnet.gleif.org:3903",
  schemaServer: "https://schema.testnet.gleif.org:7723",
};

export const useConfig = () => {
  const location = useLocation();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  useEffect(() => {
    if (location.state?.config) {
      setConfig(location.state.config);
    }
  }, [location.state]);

  return { config, setConfig };
};
