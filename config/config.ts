// server/config.ts
import nodeConfig from "config";
import type { Method } from "../src/utilities/logging.js";

interface Config {
  credentials: {
    email: string;
    password: string;
    server: string;
  };
  logging: {
    map: {
      "0": Method;
      "1": Method;
      "2": Method;
      "3": Method;
      "4": Method;
      "5": Method;
      "6": Method;
      "7": Method;
    };
  };
  party: {
    allowed: true | string[];
    checkEveryMs: number;
    leader: string;
  };
  pingCompensation: {
    maxPings: number;
    pingEveryMs: number;
  };
}

const config: Config = {
  credentials: nodeConfig.get("credentials"),
  logging: nodeConfig.get("logging"),
  party: nodeConfig.get("party"),
  pingCompensation: nodeConfig.get("pingCompensation"),
};

export default config;
