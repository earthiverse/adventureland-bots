import { expect, test } from "bun:test";
import nm from "nodemailer";
import config from "../../config/config.js";

// TODO: Don't run this test in CI if we ever run CI
test("sendmail configuration", () => {
  const { nodemailer } = config.logging;

  // Config should exist
  expect(nodemailer).toBeDefined();

  // Should verify
  const transporter = nm.createTransport(nodemailer.transport);
  expect(transporter.verify()).resolves.toBeTruthy();
}, 10_000);
