# BarkBase Unified Backend

## Local Development

```bash
npm install
npm run dev
```

This starts `server.js`, which boots the Express app via `createApp()` from `src/router.js`.

### Database Configuration

The backend uses the db-layer module for database connectivity. Configuration differs between local and Lambda environments:

**Local Development** - Set these environment variables (e.g., in `.env`):

```bash
# Direct connection (no Secrets Manager)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barkbase
DB_USER=postgres
DB_PASSWORD=your_password

# Optional pool settings
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

**AWS Lambda** - Uses Secrets Manager (set automatically by CDK):

```bash
DB_SECRET_NAME=barkbase/dev/postgres/credentials
AWS_REGION=us-east-2
```

The db-layer automatically detects which mode to use based on whether `DB_SECRET_NAME` is set.

## AWS Lambda Adapter

`lambda-handler.js` wraps the same Express app using `serverless-http` and exports `module.exports.handler`. This is the entrypoint used when wiring the unified backend to API Gateway/Lambda.

## Database Layer

Database connectivity is provided by `aws/layers/db-layer/nodejs/db.js`:
- Exports `getPool()` which returns a singleton `pg.Pool` instance
- In Lambda: Fetches credentials from AWS Secrets Manager
- In local dev: Uses direct environment variables
- Pool is lazily initialized on first query

## Legacy Microservices

Existing Lambda folders (e.g., `aws/lambdas/*`) remain the live production backend until infrastructure is updated. The unified backend currently runs in parallel for consolidation work.
