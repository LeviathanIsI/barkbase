/**
 * =============================================================================
 * BarkBase SMS Utilities (Twilio)
 * =============================================================================
 * 
 * SMS sending utilities using Twilio
 * 
 * Required Environment Variables:
 * - TWILIO_ACCOUNT_SID: Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Twilio Auth Token
 * - TWILIO_PHONE_NUMBER: Twilio phone number to send from
 * 
 * =============================================================================
 */

let twilioClient = null;

/**
 * Initialize Twilio client (lazy initialization)
 */
function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn('[SMS] Twilio credentials not configured');
      return null;
    }

    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Get the configured Twilio phone number
 */
function getTwilioPhoneNumber() {
  return process.env.TWILIO_PHONE_NUMBER;
}

/**
 * Format a phone number for Twilio (E.164 format)
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, assume it's already in E.164 format
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's a 10-digit US number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's an 11-digit number starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Otherwise, try adding + prefix
  return `+${cleaned}`;
}

/**
 * Send an SMS message
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Twilio message object
 */
async function sendSMS(to, message, options = {}) {
  const client = getTwilioClient();
  
  if (!client) {
    console.error('[SMS] Twilio client not available');
    throw new Error('SMS service not configured');
  }
  
  const fromNumber = getTwilioPhoneNumber();
  if (!fromNumber) {
    console.error('[SMS] Twilio phone number not configured');
    throw new Error('SMS phone number not configured');
  }
  
  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) {
    throw new Error('Invalid phone number');
  }
  
  console.log('[SMS] Sending to:', formattedTo, 'Message length:', message.length);
  
  try {
    const result = await client.messages.create({
      to: formattedTo,
      from: fromNumber,
      body: message,
      ...options,
    });
    
    console.log('[SMS] Sent successfully. SID:', result.sid);
    
    return {
      success: true,
      sid: result.sid,
      to: result.to,
      status: result.status,
    };
  } catch (error) {
    console.error('[SMS] Failed to send:', error.message);
    throw error;
  }
}

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

const SMS_TEMPLATES = {
  bookingConfirmation: (data) => 
    `BarkBase: Your booking for ${data.petNames || 'your pet'} is confirmed! ` +
    `Check-in: ${data.startDate}. ` +
    `Questions? Reply to this message or call us.`,
  
  bookingReminder: (data) =>
    `BarkBase Reminder: ${data.petNames || 'Your pet'}'s stay starts tomorrow (${data.startDate}). ` +
    `Check-in time: ${data.checkInTime || '9 AM'}. See you soon!`,
  
  bookingCancellation: (data) =>
    `BarkBase: Your booking for ${data.startDate} has been cancelled. ` +
    `If you have questions, please contact us.`,
  
  checkInConfirmation: (data) =>
    `BarkBase: ${data.petNames || 'Your pet'} has been checked in! ` +
    `We'll take great care of them. Expected checkout: ${data.endDate}.`,
  
  checkOutConfirmation: (data) =>
    `BarkBase: ${data.petNames || 'Your pet'} has been checked out. ` +
    `Thanks for choosing us! We hope to see you again soon.`,
  
  vaccinationReminder: (data) =>
    `BarkBase: Reminder - ${data.petName}'s ${data.vaccineName} vaccination expires on ${data.expirationDate}. ` +
    `Please update before your next visit.`,
  
  paymentReminder: (data) =>
    `BarkBase: Friendly reminder - you have an outstanding balance of $${data.amount}. ` +
    `Please contact us to arrange payment.`,
  
  appointmentReminder: (data) =>
    `BarkBase: Reminder - ${data.petName} has an appointment tomorrow at ${data.time}. ` +
    `See you then!`,
  
  custom: (data) => data.message,
};

/**
 * Send a templated SMS
 * @param {string} templateName - Template name
 * @param {string} to - Recipient phone number
 * @param {object} data - Template data
 * @returns {Promise<object>}
 */
async function sendTemplatedSMS(templateName, to, data) {
  const template = SMS_TEMPLATES[templateName];
  
  if (!template) {
    throw new Error(`Unknown SMS template: ${templateName}`);
  }
  
  const message = template(data);
  return sendSMS(to, message);
}

/**
 * Send booking confirmation SMS
 */
async function sendBookingConfirmationSMS(to, data) {
  return sendTemplatedSMS('bookingConfirmation', to, data);
}

/**
 * Send booking reminder SMS
 */
async function sendBookingReminderSMS(to, data) {
  return sendTemplatedSMS('bookingReminder', to, data);
}

/**
 * Send check-in confirmation SMS
 */
async function sendCheckInConfirmationSMS(to, data) {
  return sendTemplatedSMS('checkInConfirmation', to, data);
}

/**
 * Send check-out confirmation SMS
 */
async function sendCheckOutConfirmationSMS(to, data) {
  return sendTemplatedSMS('checkOutConfirmation', to, data);
}

/**
 * Send vaccination reminder SMS
 */
async function sendVaccinationReminderSMS(to, data) {
  return sendTemplatedSMS('vaccinationReminder', to, data);
}

/**
 * Send a custom SMS
 */
async function sendCustomSMS(to, message) {
  return sendSMS(to, message);
}

/**
 * Check if SMS is configured and available
 */
function isSMSConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

module.exports = {
  sendSMS,
  sendTemplatedSMS,
  sendBookingConfirmationSMS,
  sendBookingReminderSMS,
  sendCheckInConfirmationSMS,
  sendCheckOutConfirmationSMS,
  sendVaccinationReminderSMS,
  sendCustomSMS,
  formatPhoneNumber,
  isSMSConfigured,
  SMS_TEMPLATES,
};

