const nodemailer = require("nodemailer");
const { loadEnv } = require("../config/env");

async function sendMail({ to, subject, text, html }) {
  const { smtp } = loadEnv();
  const devLog =
    process.env.NODE_ENV !== "production" && !smtp.host;

  if (devLog) {
    console.log("[laas24-backend] Email (dev, SMTP not configured):", {
      to,
      subject,
      text: text?.slice(0, 500),
    });
    return { skipped: true };
  }

  if (!smtp.host || !smtp.user || !smtp.pass) {
    console.warn(
      "[laas24-backend] SMTP incomplete (need SMTP_HOST, SMTP_USER, SMTP_PASS); email not sent."
    );
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    requireTLS: smtp.port === 587,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[laas24-backend] SMTP send failed:", err?.message || err);
    throw err;
  }
  return { sent: true };
}

module.exports = { sendMail };
