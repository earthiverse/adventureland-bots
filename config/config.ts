// server/config.ts
import nodeConfig from "config";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import type { Level, Method } from "../src/utilities/logging.js";

interface Config {
  credentials: {
    email: string;
    password: string;
    server: string;
  };
  logging: {
    discord: {
      auth: string;
      client: string;
      /** Server ID */
      guild: string;
      /** Channel ID */
      channel: string;
      /** User ID */
      user: string;
    };
    nodemailer: {
      from: string;
      to: string;
      transport: SMTPTransport.Options;
    };
    map: Record<Level, Method>;
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
