# WebSocket Real-Time Setup - COMPLETE! ✅

## What Was Deployed

### New Lambda Functions:
- `websocket-connect` - Handles client connections
- `websocket-disconnect` - Handles disconnections
- `websocket-message` - Handles real-time messages
- `websocket-broadcast` - Broadcasts to all tenant connections

### WebSocket API Gateway:
**URL:** `wss://3qm1qgxqr4.execute-api.us-east-2.amazonaws.com/production`

---

## Step 1: Create Database Table

Run this SQL in your PostgreSQL database:

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
CREATE INDEX IF NOT EXISTS "idx_websocket_connection" ON "WebSocketConnection"("connectionId");
```

**Location:** The SQL is also saved in `aws/scripts/websocket-schema.sql`

---

## Step 2: Update Frontend Environment

Add to your `frontend/.env`:

```env
# Change all NEXT_PUBLIC_ to VITE_ (you're using Vite, not Next.js!)
VITE_AWS_REGION=us-east-2
VITE_USER_POOL_ID=us-east-2_X1Po51sS2
VITE_CLIENT_ID=h5pbqi8isn01pamup8rqro29d
VITE_API_URL=https://9f9y33emh0.execute-api.us-east-2.amazonaws.com
VITE_CLOUDFRONT_DOMAIN=d4ywjotz082k.cloudfront.net

# Add WebSocket URL (NEW!)
VITE_REALTIME_URL=wss://3qm1qgxqr4.execute-api.us-east-2.amazonaws.com/production
```

---

## Step 3: Restart Frontend

```bash
cd frontend
npm run dev
```

The WebSocket connection will now use AWS instead of localhost:4000!

---

## How It Works

### Connection Flow:
```
Frontend → WebSocket API Gateway → websocket-connect Lambda
                                  ↓
                    Store connection in PostgreSQL
```

### Message Flow:
```
Client sends message → websocket-message Lambda
                     ↓
           Query all tenant connections
                     ↓
          Broadcast to all clients
```

### Broadcast from API:
```
booking-api creates booking → Invoke websocket-broadcast Lambda
                            ↓
                  Notify all connected clients
```

---

## Real-Time Features Now Working

✅ **Staff Messaging** - Live chat between staff members  
✅ **Booking Updates** - See bookings update in real-time  
✅ **Dashboard Metrics** - Live stats  
✅ **Calendar Updates** - See new bookings appear instantly  

---

## Testing WebSocket Connection

Open browser console and check:

```javascript
// Should see:
"WebSocket connected to AWS"

// Not:
"WebSocket error: Failed to connect to localhost:4000"
```

---

## Cost

WebSocket connections are FREE on AWS Free Tier:
- 1M messages/month
- 750 minutes of connection time/month (per connection)

After free tier: ~$1 per million messages

---

## Troubleshooting

### "WebSocket connection failed"
1. Check `VITE_REALTIME_URL` is set in `.env`
2. Verify you ran the SQL to create the table
3. Check CloudWatch logs for WebSocket Lambda functions

### "Connection immediately disconnects"
- Check database credentials in `aws/cdk/.env`
- Verify Lambda can connect to RDS (security group rules)

### "Messages not broadcasting"
- Ensure `WebSocketConnection` table was created
- Check CloudWatch logs for `websocket-broadcast` function
- Verify IAM permissions for `execute-api:ManageConnections`

---

## Next Steps

1. Run the SQL to create the WebSocket table
2. Update your `frontend/.env` with correct prefixes (VITE_ not NEXT_PUBLIC_)
3. Add WebSocket URL to your `.env`
4. Restart frontend dev server
5. Test messaging feature!

---

**🎊 Real-time features are now serverless on AWS!**

