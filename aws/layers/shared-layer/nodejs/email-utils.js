/**
 * BarkBase Email Utilities
 * AWS SES integration for transactional emails
 */

const { SESClient, SendEmailCommand, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');

// Lazy-initialize SES client
let sesClient = null;

function getSESClient() {
  if (!sesClient) {
    sesClient = new SESClient({
      region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
    });
  }
  return sesClient;
}

// Default sender email (must be verified in SES)
const DEFAULT_SENDER = process.env.SES_FROM_EMAIL || 'noreply@barkbase.app';
const APP_NAME = 'BarkBase';

/**
 * Email Templates
 */
const emailTemplates = {
  bookingConfirmation: {
    subject: 'Booking Confirmed - {petName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Booking Confirmed!</h1>
        <p>Hi {ownerName},</p>
        <p>Your booking for <strong>{petName}</strong> has been confirmed.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Service:</strong> {serviceName}</p>
          <p><strong>Check-in:</strong> {checkInDate}</p>
          <p><strong>Check-out:</strong> {checkOutDate}</p>
          {facilityInfo}
        </div>
        <p>If you have any questions, please contact us.</p>
        <p>Thank you for choosing {appName}!</p>
      </div>
    `,
    text: `Booking Confirmed!

Hi {ownerName},

Your booking for {petName} has been confirmed.

Booking Details:
- Service: {serviceName}
- Check-in: {checkInDate}
- Check-out: {checkOutDate}

Thank you for choosing {appName}!`,
  },

  bookingReminder: {
    subject: 'Reminder: Upcoming Booking for {petName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Booking Reminder</h1>
        <p>Hi {ownerName},</p>
        <p>This is a friendly reminder about your upcoming booking for <strong>{petName}</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Service:</strong> {serviceName}</p>
          <p><strong>Check-in:</strong> {checkInDate}</p>
          <p><strong>Check-out:</strong> {checkOutDate}</p>
        </div>
        <h3>Please Remember to Bring:</h3>
        <ul>
          <li>Current vaccination records</li>
          <li>Any medications with instructions</li>
          <li>Your pet's favorite toy or blanket (optional)</li>
        </ul>
        <p>See you soon!</p>
      </div>
    `,
    text: `Booking Reminder

Hi {ownerName},

This is a friendly reminder about your upcoming booking for {petName}.

Service: {serviceName}
Check-in: {checkInDate}
Check-out: {checkOutDate}

Please remember to bring:
- Current vaccination records
- Any medications with instructions
- Your pet's favorite toy or blanket (optional)

See you soon!`,
  },

  vaccinationReminder: {
    subject: 'Vaccination Reminder for {petName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Vaccination Reminder</h1>
        <p>Hi {ownerName},</p>
        <p>The following vaccination for <strong>{petName}</strong> is {expirationStatus}:</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p><strong>Vaccine:</strong> {vaccineName}</p>
          <p><strong>Expiration Date:</strong> {expirationDate}</p>
        </div>
        <p>Please update your pet's vaccination records to ensure uninterrupted service.</p>
        <p>If you have questions about vaccination requirements, please contact us.</p>
      </div>
    `,
    text: `Vaccination Reminder

Hi {ownerName},

The following vaccination for {petName} is {expirationStatus}:

Vaccine: {vaccineName}
Expiration Date: {expirationDate}

Please update your pet's vaccination records to ensure uninterrupted service.`,
  },

  checkInConfirmation: {
    subject: '{petName} Has Been Checked In',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Check-In Confirmed!</h1>
        <p>Hi {ownerName},</p>
        <p><strong>{petName}</strong> has been successfully checked in.</p>
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Check-in Time:</strong> {checkInTime}</p>
          <p><strong>Service:</strong> {serviceName}</p>
          <p><strong>Expected Check-out:</strong> {checkOutDate}</p>
        </div>
        <p>We'll take great care of {petName}! You'll receive updates during their stay.</p>
      </div>
    `,
    text: `Check-In Confirmed!

Hi {ownerName},

{petName} has been successfully checked in.

Check-in Time: {checkInTime}
Service: {serviceName}
Expected Check-out: {checkOutDate}

We'll take great care of {petName}!`,
  },

  checkOutConfirmation: {
    subject: '{petName} is Ready for Pick-Up',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Ready for Pick-Up!</h1>
        <p>Hi {ownerName},</p>
        <p><strong>{petName}</strong> has been checked out and is ready for pick-up!</p>
        <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Check-out Time:</strong> {checkOutTime}</p>
          {invoiceInfo}
        </div>
        <p>Thank you for choosing {appName}. We hope to see {petName} again soon!</p>
      </div>
    `,
    text: `Ready for Pick-Up!

Hi {ownerName},

{petName} has been checked out and is ready for pick-up!

Check-out Time: {checkOutTime}

Thank you for choosing {appName}. We hope to see {petName} again soon!`,
  },

  invoiceCreated: {
    subject: 'Invoice #{invoiceNumber} from {businessName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Invoice #{invoiceNumber}</h1>
        <p>Hi {ownerName},</p>
        <p>A new invoice has been created for your recent services.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> #{invoiceNumber}</p>
          <p><strong>Amount Due:</strong> {amount}</p>
          <p><strong>Due Date:</strong> {dueDate}</p>
        </div>
        {paymentLink}
        <p>Thank you for your business!</p>
      </div>
    `,
    text: `Invoice #{invoiceNumber}

Hi {ownerName},

A new invoice has been created for your recent services.

Invoice Number: #{invoiceNumber}
Amount Due: {amount}
Due Date: {dueDate}

Thank you for your business!`,
  },

  paymentConfirmation: {
    subject: 'Payment Received - Thank You!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Payment Received!</h1>
        <p>Hi {ownerName},</p>
        <p>We've received your payment. Thank you!</p>
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Paid:</strong> {amount}</p>
          <p><strong>Payment Date:</strong> {paymentDate}</p>
          <p><strong>Reference:</strong> {paymentReference}</p>
        </div>
        <p>Thank you for choosing {appName}!</p>
      </div>
    `,
    text: `Payment Received!

Hi {ownerName},

We've received your payment. Thank you!

Amount Paid: {amount}
Payment Date: {paymentDate}
Reference: {paymentReference}

Thank you for choosing {appName}!`,
  },

  welcome: {
    subject: 'Welcome to {businessName}!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Welcome to {businessName}!</h1>
        <p>Hi {ownerName},</p>
        <p>Thank you for creating an account with us. We're excited to help take care of your furry family members!</p>
        <h3>Getting Started:</h3>
        <ul>
          <li>Add your pets to your profile</li>
          <li>Upload vaccination records</li>
          <li>Book your first service</li>
        </ul>
        <p>If you have any questions, we're here to help!</p>
        <p>Best regards,<br>The {businessName} Team</p>
      </div>
    `,
    text: `Welcome to {businessName}!

Hi {ownerName},

Thank you for creating an account with us. We're excited to help take care of your furry family members!

Getting Started:
- Add your pets to your profile
- Upload vaccination records
- Book your first service

If you have any questions, we're here to help!

Best regards,
The {businessName} Team`,
  },

  bookingCancellation: {
    subject: 'Booking Cancelled - {petName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Booking Cancelled</h1>
        <p>Hi {ownerName},</p>
        <p>Your booking for <strong>{petName}</strong> has been cancelled.</p>
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0;">Cancelled Booking Details</h3>
          <p><strong>Service:</strong> {serviceName}</p>
          <p><strong>Original Check-in:</strong> {checkInDate}</p>
          <p><strong>Original Check-out:</strong> {checkOutDate}</p>
          {cancellationReason}
        </div>
        <p>If you'd like to rebook, please contact us or visit our website.</p>
        <p>We hope to see you and {petName} again soon!</p>
      </div>
    `,
    text: `Booking Cancelled

Hi {ownerName},

Your booking for {petName} has been cancelled.

Cancelled Booking Details:
- Service: {serviceName}
- Original Check-in: {checkInDate}
- Original Check-out: {checkOutDate}

If you'd like to rebook, please contact us or visit our website.

We hope to see you and {petName} again soon!`,
  },

  bookingUpdated: {
    subject: 'Booking Updated - {petName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Booking Updated</h1>
        <p>Hi {ownerName},</p>
        <p>Your booking for <strong>{petName}</strong> has been updated.</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0;">Updated Booking Details</h3>
          <p><strong>Service:</strong> {serviceName}</p>
          <p><strong>Check-in:</strong> {checkInDate}</p>
          <p><strong>Check-out:</strong> {checkOutDate}</p>
          {updateNotes}
        </div>
        <p>If you have any questions about these changes, please contact us.</p>
        <p>Thank you for choosing {appName}!</p>
      </div>
    `,
    text: `Booking Updated

Hi {ownerName},

Your booking for {petName} has been updated.

Updated Booking Details:
- Service: {serviceName}
- Check-in: {checkInDate}
- Check-out: {checkOutDate}

If you have any questions about these changes, please contact us.

Thank you for choosing {appName}!`,
  },
};

/**
 * Replace template variables with actual values
 */
function renderTemplate(template, variables) {
  let html = template.html || '';
  let text = template.text || '';
  let subject = template.subject || '';

  // Add default app name
  variables.appName = variables.appName || APP_NAME;

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    const safeValue = value != null ? String(value) : '';
    html = html.replace(regex, safeValue);
    text = text.replace(regex, safeValue);
    subject = subject.replace(regex, safeValue);
  });

  return { html, text, subject };
}

/**
 * Send a transactional email
 */
async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_SENDER,
  replyTo,
  cc,
  bcc,
}) {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  const toAddresses = Array.isArray(to) ? to : [to];

  const params = {
    Source: from,
    Destination: {
      ToAddresses: toAddresses,
      ...(cc && { CcAddresses: Array.isArray(cc) ? cc : [cc] }),
      ...(bcc && { BccAddresses: Array.isArray(bcc) ? bcc : [bcc] }),
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
      Body: {
        ...(html && {
          Html: {
            Charset: 'UTF-8',
            Data: html,
          },
        }),
        ...(text && {
          Text: {
            Charset: 'UTF-8',
            Data: text,
          },
        }),
      },
    },
    ...(replyTo && {
      ReplyToAddresses: Array.isArray(replyTo) ? replyTo : [replyTo],
    }),
  };

  console.log('[Email] Sending email to:', toAddresses.join(', '), 'subject:', subject);

  try {
    const client = getSESClient();
    const command = new SendEmailCommand(params);
    const result = await client.send(command);

    console.log('[Email] Sent successfully, MessageId:', result.MessageId);

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error('[Email] Failed to send:', error.message);
    throw error;
  }
}

/**
 * Send email using a template
 */
async function sendTemplatedEmail(templateName, to, variables, options = {}) {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  const rendered = renderTemplate(template, variables);

  return sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...options,
  });
}

/**
 * Send booking confirmation email
 */
async function sendBookingConfirmation(booking, owner, pet, tenant) {
  return sendTemplatedEmail('bookingConfirmation', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    serviceName: booking.service_name || booking.service_type || 'Boarding',
    checkInDate: formatDate(booking.check_in),
    checkOutDate: formatDate(booking.check_out),
    facilityInfo: tenant?.name ? `<p><strong>Location:</strong> ${tenant.name}</p>` : '',
    businessName: tenant?.name || APP_NAME,
  });
}

/**
 * Send booking reminder email
 */
async function sendBookingReminder(booking, owner, pet) {
  return sendTemplatedEmail('bookingReminder', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    serviceName: booking.service_name || booking.service_type || 'Boarding',
    checkInDate: formatDate(booking.check_in),
    checkOutDate: formatDate(booking.check_out),
  });
}

/**
 * Send vaccination reminder email
 */
async function sendVaccinationReminder(vaccination, owner, pet) {
  const expDate = new Date(vaccination.expiration_date);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

  let expirationStatus;
  if (daysUntilExpiry < 0) {
    expirationStatus = 'expired';
  } else if (daysUntilExpiry <= 7) {
    expirationStatus = 'expiring this week';
  } else if (daysUntilExpiry <= 30) {
    expirationStatus = 'expiring soon';
  } else {
    expirationStatus = `expiring in ${daysUntilExpiry} days`;
  }

  return sendTemplatedEmail('vaccinationReminder', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    vaccineName: vaccination.vaccine_name,
    expirationDate: formatDate(vaccination.expiration_date),
    expirationStatus,
  });
}

/**
 * Send check-in confirmation email
 */
async function sendCheckInConfirmation(booking, owner, pet) {
  return sendTemplatedEmail('checkInConfirmation', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    checkInTime: formatDateTime(new Date()),
    serviceName: booking.service_name || booking.service_type || 'Boarding',
    checkOutDate: formatDate(booking.check_out),
  });
}

/**
 * Send check-out confirmation email
 */
async function sendCheckOutConfirmation(booking, owner, pet, invoiceAmount) {
  return sendTemplatedEmail('checkOutConfirmation', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    checkOutTime: formatDateTime(new Date()),
    invoiceInfo: invoiceAmount
      ? `<p><strong>Total:</strong> $${(invoiceAmount / 100).toFixed(2)}</p>`
      : '',
  });
}

/**
 * Send booking cancellation email
 */
async function sendBookingCancellation(booking, owner, pet, reason) {
  return sendTemplatedEmail('bookingCancellation', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    serviceName: booking.service_name || booking.service_type || 'Boarding',
    checkInDate: formatDate(booking.check_in),
    checkOutDate: formatDate(booking.check_out),
    cancellationReason: reason
      ? `<p><strong>Reason:</strong> ${reason}</p>`
      : '',
  });
}

/**
 * Send booking updated email
 */
async function sendBookingUpdated(booking, owner, pet, notes) {
  return sendTemplatedEmail('bookingUpdated', owner.email, {
    ownerName: owner.first_name || owner.name || 'Valued Customer',
    petName: pet.name,
    serviceName: booking.service_name || booking.service_type || 'Boarding',
    checkInDate: formatDate(booking.check_in),
    checkOutDate: formatDate(booking.check_out),
    updateNotes: notes
      ? `<p><strong>Notes:</strong> ${notes}</p>`
      : '',
  });
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Helper: Format date and time
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

module.exports = {
  sendEmail,
  sendTemplatedEmail,
  sendBookingConfirmation,
  sendBookingReminder,
  sendVaccinationReminder,
  sendCheckInConfirmation,
  sendCheckOutConfirmation,
  sendBookingCancellation,
  sendBookingUpdated,
  emailTemplates,
  formatDate,
  formatDateTime,
};
