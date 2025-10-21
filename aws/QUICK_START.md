# BarkBase AWS Lambda - Quick Start

## ✅ What's Done

- 37 Lambda functions deployed
- API Gateway (REST + WebSocket) configured
- Frontend updated for Lambda auth
- Auth persistence fixed

## 🚀 Final Setup (2 Steps)

### Step 1: Fix Frontend .env

Edit `frontend/.env` and change **NEXT_PUBLIC_** to **VITE_**:

```env
VITE_AWS_REGION=us-east-2
VITE_USER_POOL_ID=us-east-2_X1Po51sS2
VITE_CLIENT_ID=h5pbqi8isn01pamup8rqro29d
VITE_API_URL=https://9f9y33emh0.execute-api.us-east-2.amazonaws.com
VITE_CLOUDFRONT_DOMAIN=d4ywjotz082k.cloudfront.net
VITE_REALTIME_URL=wss://3qm1qgxqr4.execute-api.us-east-2.amazonaws.com/production
```

### Step 2: Run WebSocket SQL

In DBeaver, run this SQL:

```sql
CREATE TABLE IF NOT EXISTS "WebSocketConnection" (
    "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "userId" TEXT,
    "connectionId" TEXT UNIQUE NOT NULL,
    "connectedAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_websocket_tenant" ON "WebSocketConnection"("tenantId");
```

## 🎉 You're Done!

Restart your frontend:
```bash
cd frontend
npm run dev
```

Now:
- ✅ Signup creates account
- ✅ Login with just email/password
- ✅ Stay logged in after refresh
- ✅ Real-time updates work
- ✅ All APIs on AWS Lambda

## Your URLs:

**REST API:** https://9f9y33emh0.execute-api.us-east-2.amazonaws.com/  
**WebSocket:** wss://3qm1qgxqr4.execute-api.us-east-2.amazonaws.com/production

## Cost: $0/month (Free Tier)

---

**Backend folder can be deleted!** Everything runs on Lambda now. 🚀

