import config from "config";

/**
 * Levels correspond to https://datatracker.ietf.org/doc/html/rfc5424
 */
export enum Level {
  Emergency = 0,
  Alert = 1,
  Critical = 2,
  Error = 3,
  Warning = 4,
  Notice = 5,
  Informational = 6,
  Debug = 7,
}

export type Method = "console" | "ignore";

const LOG_MAP = config.get<{ [T in Level]: Method }>("logging.map");

function log(message: string | Error, level: Level = Level.Informational): void {
  const method: Method = LOG_MAP[level] ?? "ignore";
  if (method === "ignore") return; // Ignoring

  // Change to string
  message = message instanceof Error ? message.message : message;

  switch (method) {
    case "console":
      switch (level) {
        case Level.Debug:
          return console.debug(message);
        case Level.Informational:
        case Level.Notice:
          return console.log(message);
        case Level.Warning:
          return console.warn(message);
        case Level.Error:
        case Level.Critical:
        case Level.Alert:
        case Level.Emergency:
          return console.error(message);
      }
  }
}

export function logInformational(message: string | Error): void {
  return log(message, Level.Informational);
}

export function logDebug(message: string | Error): void {
  return log(message, Level.Debug);
}
