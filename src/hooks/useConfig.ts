import { useConfigContext } from "@/context/ConfigContext";

export const useConfig = () => {
  const { config, setEnv, env } = useConfigContext();
  return { config, setEnv, env };
};
