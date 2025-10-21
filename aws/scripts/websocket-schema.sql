-- WebSocket Connection Tracking Table
-- Run this SQL in your PostgreSQL database to enable WebSocket support

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

-- Optional: Add foreign key if you want referential integrity
-- ALTER TABLE "WebSocketConnection" ADD CONSTRAINT "fk_websocket_tenant" 
--   FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE;

