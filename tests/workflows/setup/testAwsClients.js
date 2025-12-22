/**
 * Test AWS Clients for LocalStack
 *
 * Provides SQS client configured to work with LocalStack for integration
 * and E2E tests. Uses LocalStack endpoint at localhost:4566.
 */

const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  PurgeQueueCommand,
  GetQueueAttributesCommand,
} = require('@aws-sdk/client-sqs');

// LocalStack configuration
const LOCALSTACK_ENDPOINT = 'http://localhost:4566';
const AWS_REGION = 'us-east-1';

// Queue URLs (LocalStack format)
const QUEUE_URLS = {
  trigger: 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/workflow-trigger-queue',
  step: 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/workflow-step-queue',
  dlq: 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/workflow-dlq',
};

// Create SQS client configured for LocalStack
const sqsClient = new SQSClient({
  region: AWS_REGION,
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

/**
 * Send a message to the workflow trigger queue
 * @param {object} message - Message body (will be JSON.stringify'd)
 * @param {object} options - Additional options
 * @returns {Promise<import('@aws-sdk/client-sqs').SendMessageCommandOutput>}
 */
async function sendToTriggerQueue(message, options = {}) {
  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URLS.trigger,
    MessageBody: JSON.stringify(message),
    ...options,
  });

  return sqsClient.send(command);
}

/**
 * Send a message to the workflow step queue
 * @param {object} message - Message body (will be JSON.stringify'd)
 * @param {object} options - Additional options
 * @returns {Promise<import('@aws-sdk/client-sqs').SendMessageCommandOutput>}
 */
async function sendToStepQueue(message, options = {}) {
  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URLS.step,
    MessageBody: JSON.stringify(message),
    ...options,
  });

  return sqsClient.send(command);
}

/**
 * Receive messages from a queue
 * @param {string} queueType - 'trigger', 'step', or 'dlq'
 * @param {object} options - ReceiveMessage options
 * @returns {Promise<object[]>} - Array of messages
 */
async function receiveFromQueue(queueType, options = {}) {
  const queueUrl = QUEUE_URLS[queueType];
  if (!queueUrl) {
    throw new Error(`Unknown queue type: ${queueType}`);
  }

  const command = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: options.maxMessages || 10,
    WaitTimeSeconds: options.waitTimeSeconds || 5,
    VisibilityTimeout: options.visibilityTimeout || 30,
    MessageAttributeNames: options.messageAttributeNames || ['All'],
    ...options,
  });

  const response = await sqsClient.send(command);
  return response.Messages || [];
}

/**
 * Delete a message from a queue
 * @param {string} queueType - 'trigger', 'step', or 'dlq'
 * @param {string} receiptHandle - Message receipt handle
 */
async function deleteFromQueue(queueType, receiptHandle) {
  const queueUrl = QUEUE_URLS[queueType];
  if (!queueUrl) {
    throw new Error(`Unknown queue type: ${queueType}`);
  }

  const command = new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  });

  return sqsClient.send(command);
}

/**
 * Purge all messages from a queue
 * @param {string} queueType - 'trigger', 'step', or 'dlq'
 */
async function purgeQueue(queueType) {
  const queueUrl = QUEUE_URLS[queueType];
  if (!queueUrl) {
    throw new Error(`Unknown queue type: ${queueType}`);
  }

  try {
    const command = new PurgeQueueCommand({
      QueueUrl: queueUrl,
    });

    await sqsClient.send(command);
    console.log(`[TestAwsClients] Purged queue: ${queueType}`);
  } catch (error) {
    // PurgeQueue can fail if called too recently
    if (error.name === 'PurgeQueueInProgress') {
      console.log(`[TestAwsClients] Queue ${queueType} purge already in progress`);
    } else {
      throw error;
    }
  }
}

/**
 * Purge all workflow queues
 */
async function purgeAllQueues() {
  await Promise.all([
    purgeQueue('trigger'),
    purgeQueue('step'),
    purgeQueue('dlq'),
  ]);
}

/**
 * Get approximate message count in a queue
 * @param {string} queueType - 'trigger', 'step', or 'dlq'
 * @returns {Promise<number>}
 */
async function getQueueMessageCount(queueType) {
  const queueUrl = QUEUE_URLS[queueType];
  if (!queueUrl) {
    throw new Error(`Unknown queue type: ${queueType}`);
  }

  const command = new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages'],
  });

  const response = await sqsClient.send(command);
  return parseInt(response.Attributes?.ApproximateNumberOfMessages || '0', 10);
}

/**
 * Wait for a specific number of messages in a queue
 * @param {string} queueType - 'trigger', 'step', or 'dlq'
 * @param {number} expectedCount - Expected message count
 * @param {number} timeoutMs - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} - Whether the expected count was reached
 */
async function waitForQueueMessages(queueType, expectedCount, timeoutMs = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const count = await getQueueMessageCount(queueType);
    if (count >= expectedCount) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Test LocalStack connectivity
 * @returns {Promise<boolean>}
 */
async function testLocalStackConnection() {
  try {
    await getQueueMessageCount('trigger');
    console.log('[TestAwsClients] LocalStack connection successful');
    return true;
  } catch (error) {
    console.error('[TestAwsClients] LocalStack connection failed:', error.message);
    return false;
  }
}

module.exports = {
  sqsClient,
  QUEUE_URLS,
  sendToTriggerQueue,
  sendToStepQueue,
  receiveFromQueue,
  deleteFromQueue,
  purgeQueue,
  purgeAllQueues,
  getQueueMessageCount,
  waitForQueueMessages,
  testLocalStackConnection,
};
