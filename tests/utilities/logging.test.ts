import nm from "nodemailer";
import config from "../../config/config.js";

// TODO: Don't run this test in CI if we ever run CI
test("sendmail configuration", async () => {
  const { nodemailer } = config.logging;

  // Config should exist
  expect(nodemailer).toBeDefined();

  // Should verify
  const transporter = nm.createTransport(nodemailer.transport);
  await expect(transporter.verify()).resolves.toBeTruthy();
}, 10_000);
