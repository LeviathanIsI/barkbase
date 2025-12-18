/**
 * Send Email Action Executor
 *
 * Sends emails using configured email provider.
 * Supports HTML templates and template variables.
 */

const { replaceTemplateVariables } = require('./utils/template-variables');

/**
 * Execute the send_email action
 * @param {Object} config - Action configuration
 * @param {string} config.subject - Email subject
 * @param {string} config.body - Email body (HTML supported)
 * @param {string} config.emailField - Field on record containing email (default: 'email')
 * @param {string} config.templateId - Optional email template ID
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma } = context;
  const { subject, body, emailField = 'email', templateId } = config;

  // Get email address from record
  const emailAddress = record[emailField] || record.email;

  if (!emailAddress) {
    throw new Error(`No email address found on record (checked field: ${emailField})`);
  }

  // Check email consent
  if (record.email_consent === false) {
    return {
      skipped: true,
      reason: 'Contact has not consented to email',
    };
  }

  let emailSubject = subject;
  let emailBody = body;

  // If using a template, fetch it
  if (templateId) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId, tenant_id: tenantId },
    });

    if (template) {
      emailSubject = template.subject;
      emailBody = template.body;
    }
  }

  if (!emailSubject || !emailBody) {
    throw new Error('Email subject and body are required');
  }

  // Replace template variables
  const processedSubject = replaceTemplateVariables(emailSubject, record);
  const processedBody = replaceTemplateVariables(emailBody, record);

  // Get tenant's email configuration
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      email_provider: true,
      email_config: true,
      name: true,
    },
  });

  // Send email
  const result = await sendEmail({
    provider: tenant?.email_provider || 'console',
    config: tenant?.email_config || {},
    to: emailAddress,
    subject: processedSubject,
    html: processedBody,
    fromName: tenant?.name || 'BarkBase',
  });

  // Log the email
  await prisma.communicationLog.create({
    data: {
      tenant_id: tenantId,
      type: 'email',
      direction: 'outbound',
      status: result.success ? 'sent' : 'failed',
      to_address: emailAddress,
      subject: processedSubject,
      content: processedBody,
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
    to: emailAddress,
    subject: processedSubject,
  };
}

/**
 * Send email via configured provider
 */
async function sendEmail({ provider, config, to, subject, html, fromName }) {
  switch (provider) {
    case 'sendgrid':
      return sendViaSendGrid(config, to, subject, html, fromName);
    case 'ses':
      return sendViaSes(config, to, subject, html, fromName);
    case 'postmark':
      return sendViaPostmark(config, to, subject, html, fromName);
    case 'resend':
      return sendViaResend(config, to, subject, html, fromName);
    default:
      // Console/development mode
      console.log(`[Email] Would send to ${to}:`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Body: ${html.substring(0, 200)}...`);
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
      };
  }
}

async function sendViaSendGrid(config, to, subject, html, fromName) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(config.apiKey);

  const [response] = await sgMail.send({
    to,
    from: { email: config.fromEmail, name: fromName },
    subject,
    html,
  });

  return {
    success: true,
    messageId: response.headers['x-message-id'],
  };
}

async function sendViaSes(config, to, subject, html, fromName) {
  const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

  const client = new SESClient({
    region: config.region || 'us-east-1',
  });

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: { Html: { Charset: 'UTF-8', Data: html } },
      Subject: { Charset: 'UTF-8', Data: subject },
    },
    Source: `${fromName} <${config.fromEmail}>`,
  });

  const result = await client.send(command);

  return {
    success: true,
    messageId: result.MessageId,
  };
}

async function sendViaPostmark(config, to, subject, html, fromName) {
  const postmark = require('postmark');
  const client = new postmark.ServerClient(config.serverToken);

  const result = await client.sendEmail({
    From: `${fromName} <${config.fromEmail}>`,
    To: to,
    Subject: subject,
    HtmlBody: html,
  });

  return {
    success: true,
    messageId: result.MessageID,
  };
}

async function sendViaResend(config, to, subject, html, fromName) {
  const { Resend } = require('resend');
  const resend = new Resend(config.apiKey);

  const result = await resend.emails.send({
    from: `${fromName} <${config.fromEmail}>`,
    to: [to],
    subject,
    html,
  });

  return {
    success: true,
    messageId: result.id,
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.templateId) {
    if (!config.subject || config.subject.trim() === '') {
      errors.push('Email subject is required');
    }

    if (!config.body || config.body.trim() === '') {
      errors.push('Email body is required');
    }
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
