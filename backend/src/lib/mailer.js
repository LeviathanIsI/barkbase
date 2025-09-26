const nodemailer = require('nodemailer');
const env = require('../config/env');

const buildTransport = () => {
  if (env.email.provider === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
};

const transporter = buildTransport();

const sendMail = async (options) =>
  transporter.sendMail({
    from: env.email.from,
    ...options,
  });

module.exports = {
  sendMail,
  transporter,
};
