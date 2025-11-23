const serverless = require('serverless-http');
const { createApp } = require('./src/router');

const app = createApp();

module.exports.handler = serverless(app, {
  requestId: 'awsRequestId',
});

