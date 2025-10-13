const { sendMail } = require('../../lib/mailer');

const DEFAULT_SUBJECT = 'Notification from BarkBase';
const DEFAULT_BODY = 'You have a notification from BarkBase.';

function replaceVars(str, context) {
  if (!str) {
    return str;
  }

  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    for (const key of keys) {
      if (value === null || value === undefined) {
        return match;
      }
      value = value[key];
    }
    return value !== undefined ? value : match;
  });
}

function resolveRecipient(to, context, customEmail) {
  switch (to) {
    case 'owner':
      return context.owner?.email || context.payload?.owner?.email;
    case 'emergency':
      return context.owner?.emergencyContact?.email || context.payload?.owner?.emergencyContact?.email;
    case 'custom':
      return customEmail;
    default:
      return context.owner?.email;
  }
}

function resolvePhone(to, context, customPhone) {
  switch (to) {
    case 'owner':
      return context.owner?.phone || context.payload?.owner?.phone;
    case 'custom':
      return customPhone;
    default:
      return context.owner?.phone;
  }
}

async function sendEmail({ context, config, log }) {
  const { emailTemplate, to, customToEmail } = config;

  const recipient = resolveRecipient(to, context, customToEmail);

  if (!recipient) {
    throw new Error(`Email recipient not found for to='${to}'`);
  }

  const subject = replaceVars(emailTemplate || DEFAULT_SUBJECT, context);
  const body = replaceVars(emailTemplate || DEFAULT_BODY, context);

  log(`Sending email to ${recipient}`, { subject });

  await sendMail({
    to: recipient,
    subject,
    text: body,
    html: `<p>${body}</p>`,
  });

  return {
    result: {
      to: recipient,
      subject,
      sent: true,
    },
  };
}

async function sendSms({ context, config, log }) {
  const { smsMessage, to, customToPhone } = config;
  const phoneNumber = resolvePhone(to, context, customToPhone);

  if (!phoneNumber) {
    throw new Error(`SMS recipient phone not found for to='${to}'`);
  }

  const messageTemplate = smsMessage || DEFAULT_BODY;
  const message = replaceVars(messageTemplate, context);

  log(`Sending SMS to ${phoneNumber}`, { preview: message.substring(0, 50) });

  // TODO: Integrate with real provider (Twilio, etc.)
  return {
    result: {
      to: phoneNumber,
      message,
      sent: true,
      provider: 'stub',
    },
  };
}

module.exports = {
  sendEmail,
  sendSms,
};
