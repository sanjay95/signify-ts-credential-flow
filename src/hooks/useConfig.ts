
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface Config {
  adminUrl: string;
  bootUrl: string;
}

const DEFAULT_CONFIG: Config = {
  adminUrl: "http://localhost:3901",
  bootUrl: "http://localhost:3903"
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
