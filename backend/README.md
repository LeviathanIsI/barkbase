# BarkBase Unified Backend

## Local Development

```
npm install
npm run dev
```

This starts `server.js`, which boots the Express app via `createApp()` from `src/router.js`.

## AWS Lambda Adapter

`lambda-handler.js` wraps the same Express app using `serverless-http` and exports `module.exports.handler`. This is the entrypoint used when wiring the unified backend to API Gateway/Lambda.

## Legacy Microservices

Existing Lambda folders (e.g., `aws/lambdas/*`) remain the live production backend until infrastructure is updated. The unified backend currently runs in parallel for consolidation work.

