ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EmailVerificationToken" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken" ("token");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken" ("userId", "expiresAt");
