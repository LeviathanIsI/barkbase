/**
 * Send SMS Action Executor
 *
 * Sends SMS messages to contacts using configured SMS provider.
 * Supports template variables for personalization.
 */

const { replaceTemplateVariables } = require('./utils/template-variables');

/**
 * Execute the send_sms action
 * @param {Object} config - Action configuration
 * @param {string} config.message - SMS message content (may contain {{variables}})
 * @param {string} config.phoneField - Field on record containing phone number (default: 'phone')
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma } = context;
  const { message, phoneField = 'phone' } = config;

  if (!message) {
    throw new Error('SMS message is required');
  }

  // Get phone number from record
  const phoneNumber = record[phoneField] || record.phone || record.mobile;

  if (!phoneNumber) {
    throw new Error(`No phone number found on record (checked field: ${phoneField})`);
  }

  // Check SMS consent
  if (record.sms_consent === false) {
    return {
      skipped: true,
      reason: 'Contact has not consented to SMS',
    };
  }

  // Replace template variables in message
  const processedMessage = replaceTemplateVariables(message, record);

  // Get tenant's SMS configuration
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      sms_provider: true,
      sms_config: true,
    },
  });

  if (!tenant?.sms_provider) {
    throw new Error('Tenant has no SMS provider configured');
  }

  // Send SMS based on provider
  const result = await sendSms({
    provider: tenant.sms_provider,
    config: tenant.sms_config,
    to: phoneNumber,
    message: processedMessage,
  });

  // Log the SMS to the database
  await prisma.communicationLog.create({
    data: {
      tenant_id: tenantId,
      type: 'sms',
      direction: 'outbound',
      status: result.success ? 'sent' : 'failed',
      to_address: phoneNumber,
      content: processedMessage,
      provider_message_id: result.messageId,
      metadata: {
        workflow_id: context.workflowId,
        execution_id: context.executionId,
        step_id: context.stepId,
      },
    },
  });

  return {
    messageId: result.messageId,
    to: phoneNumber,
    characterCount: processedMessage.length,
    segmentCount: Math.ceil(processedMessage.length / 160),
  };
}

/**
 * Send SMS via configured provider
 */
async function sendSms({ provider, config, to, message }) {
  switch (provider) {
    case 'twilio':
      return sendViaTwilio(config, to, message);
    case 'messagebird':
      return sendViaMessageBird(config, to, message);
    case 'vonage':
      return sendViaVonage(config, to, message);
    default:
      // Mock/development mode
      console.log(`[SMS] Would send to ${to}: ${message}`);
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
      };
  }
}

async function sendViaTwilio(config, to, message) {
  const twilio = require('twilio');
  const client = twilio(config.accountSid, config.authToken);

  const result = await client.messages.create({
    body: message,
    from: config.fromNumber,
    to: to,
  });

  return {
    success: true,
    messageId: result.sid,
  };
}

async function sendViaMessageBird(config, to, message) {
  const messagebird = require('messagebird')(config.accessKey);

  return new Promise((resolve, reject) => {
    messagebird.messages.create({
      originator: config.originator,
      recipients: [to],
      body: message,
    }, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          success: true,
          messageId: response.id,
        });
      }
    });
  });
}

async function sendViaVonage(config, to, message) {
  const { Vonage } = require('@vonage/server-sdk');
  const vonage = new Vonage({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });

  const result = await vonage.sms.send({
    to: to,
    from: config.fromNumber,
    text: message,
  });

  return {
    success: true,
    messageId: result.messages[0]['message-id'],
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.message || config.message.trim() === '') {
    errors.push('SMS message is required');
  }

  if (config.message && config.message.length > 1600) {
    errors.push('SMS message exceeds maximum length (1600 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  execute,
  validate,
};
