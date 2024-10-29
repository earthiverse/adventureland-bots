import nodemailer from "nodemailer";
import config from "../../config/config.js";

test("sendmail configuration", async () => {
  const { nodemailerTransport } = config.logging;

  // Config should exist
  expect(nodemailerTransport).toBeDefined();

  // Should verify
  const transporter = nodemailer.createTransport(nodemailerTransport);
  await expect(transporter.verify()).resolves.toBeTruthy();
}, 10_000);
