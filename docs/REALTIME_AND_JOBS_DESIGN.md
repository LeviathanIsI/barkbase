# Realtime & Jobs Design

This document describes the WebSocket API and background job architecture for BarkBase Dev v2.

**Phase:** 5 of BarkBase Dev v2 Rebuild  
**Last Updated:** Phase 5 implementation

---

## Overview

BarkBase uses two additional stacks beyond the HTTP API for real-time communication and background processing:

1. **RealtimeStack**: WebSocket API for live updates and bi-directional communication
2. **JobsStack**: Scheduled jobs for data maintenance and cleanup tasks

Both stacks are VPC-enabled with database access via Secrets Manager.

---

## RealtimeStack

### Purpose

Provides real-time, bi-directional communication between the backend and frontend clients using WebSocket protocol.

### Use Cases

- Live kennel status updates
- Real-time booking notifications
- Dashboard live updates
- Cross-tab synchronization
- Staff presence tracking

### WebSocket API Configuration

| Property | Value |
|----------|-------|
| API Name | `barkbase-dev-realtime` |
| API Type | WebSocket API (API Gateway v2) |
| Protocol | WSS (WebSocket Secure) |
| Stage | `dev` (auto-deploy enabled) |

### Route Mapping

| Route | Handler | Purpose |
|-------|---------|---------|
| `$connect` | ConnectFunction | Handles new WebSocket connections |
| `$disconnect` | DisconnectFunction | Handles connection cleanup |
| `$default` | MessageFunction | Main message handler for all actions |
| `broadcast` | BroadcastFunction | Send messages to multiple connections |

### Lambda Functions

| Function Name | Source Path | Description |
|---------------|-------------|-------------|
| `barkbase-dev-realtime-connect` | `aws/lambdas/realtime-connect/index.ts` | Validates auth, stores connection ID |
| `barkbase-dev-realtime-disconnect` | `aws/lambdas/realtime-disconnect/index.ts` | Removes connection, updates presence |
| `barkbase-dev-realtime-message` | `aws/lambdas/realtime-message/index.ts` | Routes messages by action type |
| `barkbase-dev-realtime-broadcast` | `aws/lambdas/realtime-broadcast/index.ts` | Broadcasts to tenant/all connections |

### Lambda Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20.x |
| Memory | 512 MB |
| Timeout | 10 seconds |
| Tracing | X-Ray Active |
| Log Retention | 1 week |

### VPC & Database Access

All realtime Lambdas are VPC-enabled with:
- Private subnet placement
- Lambda security group
- Secrets Manager access for DB credentials

### Permissions

Message and Broadcast functions have `execute-api:ManageConnections` permission to send messages back to clients via the API Gateway Management API.

---

## JobsStack

### Purpose

Provides scheduled background jobs for data maintenance, cleanup, and migrations.

### Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Property Archival | Daily at 02:00 UTC | Soft-archive inactive properties |
| Property Deletion | Daily at 03:00 UTC | Hard-delete archived properties past retention |
| Migration | Disabled (manual) | Run data migrations when needed |

### Lambda Functions

| Function Name | Source Path | Timeout |
|---------------|-------------|---------|
| `barkbase-dev-job-property-archival` | `aws/lambdas/jobs-property-archival/index.ts` | 5 minutes |
| `barkbase-dev-job-property-deletion` | `aws/lambdas/jobs-property-deletion/index.ts` | 5 minutes |
| `barkbase-dev-job-migration` | `aws/lambdas/jobs-migration/index.ts` | 15 minutes |

### Lambda Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20.x |
| Memory | 512 MB |
| Timeout | 5-15 minutes (job-dependent) |
| Tracing | X-Ray Active |
| Log Retention | 1 month |

### EventBridge Rules

| Rule Name | Schedule | Target | Enabled |
|-----------|----------|--------|---------|
| `barkbase-dev-property-archival-schedule` | cron(0 2 * * ? *) | PropertyArchivalJobFunction | Yes |
| `barkbase-dev-property-deletion-schedule` | cron(0 3 * * ? *) | PropertyDeletionJobFunction | Yes |
| `barkbase-dev-migration-schedule` | cron(0 4 1 * ? *) | MigrationJobFunction | **No** |

### Job Descriptions

#### Property Archival Job
- **Trigger**: Daily at 02:00 UTC
- **Purpose**: Find properties marked for archival or inactive for N days
- **Action**: Soft-delete by setting `archived_at` timestamp
- **Retry**: 2 attempts on failure

#### Property Permanent Deletion Job
- **Trigger**: Daily at 03:00 UTC
- **Purpose**: Find archived properties past retention period (e.g., 90 days)
- **Action**: Hard-delete property and all related data
- **Retry**: 2 attempts on failure

#### Migration Job
- **Trigger**: Manual (rule disabled by default)
- **Purpose**: Run database migrations, schema updates, data transforms
- **Action**: Execute pending migrations in order
- **Retry**: 1 attempt on failure

---

## Cross-Stack Dependencies

### RealtimeStack Dependencies

```
NetworkStack
    ├── vpc
    ├── lambdaSecurityGroup
    └── appSubnets
         ↓
RealtimeStack
         ↑
DatabaseStack
    ├── dbSecret
    ├── hostname
    ├── port
    └── dbName
```

### JobsStack Dependencies

```
NetworkStack
    ├── vpc
    ├── lambdaSecurityGroup
    └── appSubnets
         ↓
JobsStack
         ↑
DatabaseStack
    ├── dbSecret
    ├── hostname
    ├── port
    └── dbName
```

### Shared Environment Variables

Both stacks use the same environment variable pattern:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | RDS endpoint hostname |
| `DB_PORT` | RDS port (5432) |
| `DB_NAME` | Database name (barkbase) |
| `DB_SECRET_ID` | Secrets Manager secret name |
| `DB_SECRET_ARN` | Secrets Manager secret ARN |
| `STAGE` | Deployment stage (dev) |
| `ENVIRONMENT` | Environment name (dev) |

---

## Security Notes

### Current State (Dev)

- **WebSocket Authorization**: None (TODO: Add JWT/Cognito authorizer)
- **Job Permissions**: Database read access via Secrets Manager

### TODO for Production

1. **Add WebSocket Authorizer**: Validate JWT on `$connect`
2. **Add Connection Tracking**: Store connections in DynamoDB with TTL
3. **Add Rate Limiting**: Protect against connection/message abuse
4. **Review Job Schedules**: Adjust timing for production traffic patterns
5. **Add Job Alerting**: CloudWatch alarms for job failures

---

## For ChatGPT Summary

Key facts about BarkBase Dev v2 Realtime & Jobs architecture:

1. **RealtimeStack**: WebSocket API (API Gateway v2) named `barkbase-dev-realtime`
2. **4 WebSocket Lambdas**: connect, disconnect, message, broadcast handlers
3. **WebSocket routes**: `$connect`, `$disconnect`, `$default`, `broadcast`
4. **JobsStack**: 3 scheduled job Lambdas with EventBridge rules
5. **Job schedule**: Archival at 02:00 UTC, Deletion at 03:00 UTC, Migration disabled
6. **All Lambdas VPC-enabled**: Private subnets with RDS access
7. **Database access**: Via Secrets Manager (same as service stacks)
8. **Resource counts**: RealtimeStack ~20-30, JobsStack ~15-25 (well under 500)
9. **No WebSocket authorizer yet**: Open connections (TODO for production)
10. **Jobs have retry**: 2 attempts for archival/deletion, 1 for migration
11. **Log retention**: 1 week for realtime, 1 month for jobs
12. **execute-api permissions**: Message/Broadcast can send to WebSocket connections

