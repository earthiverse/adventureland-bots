import fs from "fs";
import path from "path";
import url from "url";
import config from "../../config/config.js";

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

const LEVEL_MAP: Record<Level, string> = {
  "0": "Emergency",
  "1": "Alert",
  "2": "Critical",
  "3": "Error",
  "4": "Warning",
  "5": "Notice",
  "6": "Informational",
  "7": "Debug",
};

export type Method = "console" | "data" | "ignore";

const map = config.logging.map;

export function writeLogToData(message: string | Error, level: Level) {
  // Make sure the folder exists
  const folder = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../data/log/");
  fs.mkdirSync(folder, { recursive: true });

  // Append to logs with the filename as the date
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const time = now.slice(11, 19);
  fs.appendFileSync(path.join(folder, day), `${time} ${LEVEL_MAP[level]} ${message}`);
}

export function log(message: string | Error, level: Level): void {
  const method: Method = map[level] ?? "ignore";
  if (method === "ignore") return; // Ignoring

  // Change to string
  message = message instanceof Error ? message.message : message;

  switch (method) {
    case "console":
      switch (level) {
        case Level.Debug:
          return console.debug(message);
        default:
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
    case "data":
      return writeLogToData(message, level);
  }
}

export function logEmergency(message: string | Error): void {
  return log(message, Level.Emergency);
}

export function logAlert(message: string | Error): void {
  return log(message, Level.Alert);
}

export function logCritical(message: string | Error): void {
  return log(message, Level.Critical);
}

export function logError(message: string | Error): void {
  return log(message, Level.Error);
}

export function logWarning(message: string | Error): void {
  return log(message, Level.Warning);
}

export function logNotice(message: string | Error): void {
  return log(message, Level.Notice);
}

export function logInformational(message: string | Error): void {
  return log(message, Level.Informational);
}

export function logDebug(message: string | Error): void {
  return log(message, Level.Debug);
}
