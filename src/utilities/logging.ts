import type { TextChannel } from "discord.js";
import { Client, EmbedBuilder, IntentsBitField, type HexColorString } from "discord.js";
import fs from "fs";
import nm from "nodemailer";
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

const EMOJI_LEVEL_MAP: Record<Level, string> = {
  "0": "🔥",
  "1": "🚨",
  "2": "🛑",
  "3": "❌",
  "4": "⚠️",
  "5": "📢",
  "6": "ℹ️",
  "7": "🐞",
};

const COLOR_LEVEL_MAP: Record<Level, HexColorString> = {
  "0": "#FF0000",
  "1": "#FF4500",
  "2": "#8B0000",
  "3": "#DC143C",
  "4": "#FFD700",
  "5": "#1E90FF",
  "6": "#0073E6",
  "7": "#A9A9A9",
};

export type Method = "console" | "data" | "discord" | "email" | "ignore";

const { discord, map, nodemailer } = config.logging;

export function writeLogToData(message: string | Error, level: Level) {
  // Make sure the folder exists
  const folder = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../../data/log/");
  fs.mkdirSync(folder, { recursive: true });

  // Append to logs with the filename as the date
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const time = now.slice(11, 19);
  fs.appendFileSync(path.join(folder, day), `${time} ${LEVEL_MAP[level]} ${message}\n`);
}

if (discord === undefined) {
  for (const level in map) {
    if (map[level as unknown as Level] === "discord") throw new Error("`logging.discord` is not set up in the config!");
  }
}

const client =
  discord !== undefined
    ? new Client({
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.MessageContent,
        ],
      })
    : null;
if (client) await client.login(discord.auth); // Make sure discord is set up correctly
const channel = await client?.channels.fetch(discord.channel);

export function writeLogToDiscord(message: string | Error, level: Level) {
  if (channel === undefined || channel === null) throw new Error("`logging.discord` is not set!");

  message = message instanceof Error ? message.toString() : message;

  (channel as TextChannel)
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_LEVEL_MAP[level])
          .setTitle(EMOJI_LEVEL_MAP[level] + " " + LEVEL_MAP[level])
          .setDescription(message)
          .setTimestamp(),
      ],
    })
    .catch(() => writeLogToData(message, level));

  // (channel as TextChannel).send(`[${LEVEL_MAP[level]}] ${message}`).catch(() => writeLogToData(message, level));
}

if (nodemailer === undefined || nodemailer === null) {
  // Check if we're emailing. If we are, throw an error
  for (const level in map) {
    if (map[level as unknown as Level] === "email")
      throw new Error("`logging.nodemailer` is not set up in the config!");
  }
}

const transporter = nodemailer !== undefined ? nm.createTransport(nodemailer.transport) : null;
if (transporter) await transporter.verify(); // Make sure SMTP is set up correctly

export function writeLogToEmail(message: string | Error, level: Level) {
  if (transporter === undefined || transporter === null) throw new Error("`logging.nodemailerTransport` is not set!");

  message = message instanceof Error ? message.toString() : message;
  transporter
    .sendMail({
      from: nodemailer.from,
      to: nodemailer.to,
      subject: `[${LEVEL_MAP[level]}] ${message}`,
      text: message,
    })
    .catch(() => writeLogToData(message, level)); // Fall back to writing to log if something goes wrong
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
    case "discord":
      return writeLogToDiscord(message, level);
    case "email":
      return writeLogToEmail(message, level);
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
