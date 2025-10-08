const { PrismaClient } = require("@prisma/client");
const env = require("./env");

if (!env.database.url) {
  throw new Error(
    "DATABASE_URL is not set. Please configure backend/.env before starting the server."
  );
}

const { setRecoveryMode, isRecoveryMode } = require("./state");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.database.url,
    },
  },
  log:
    env.nodeEnv === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

if (env.database.provider === "sqlite") {
  const synchronous = (
    process.env.SQLITE_SYNCHRONOUS || "NORMAL"
  ).toUpperCase();
  prisma
    .$queryRawUnsafe("PRAGMA journal_mode=WAL;")
    .then((rows) => {
      const mode =
        Array.isArray(rows) && rows[0] ? Object.values(rows[0])[0] : null;
      if (mode && String(mode).toLowerCase() !== "wal") {
        console.warn(
          "SQLite journal_mode could not be set to WAL. Current mode:",
          mode
        );
      }
    })
    .catch((error) => console.warn("Failed to set journal_mode WAL", error));
  prisma
    .$queryRawUnsafe(
      `PRAGMA synchronous=${synchronous === "FULL" ? "FULL" : "NORMAL"};`
    )
    .catch((error) => console.warn("Failed to set PRAGMA synchronous", error));
  prisma
    .$queryRawUnsafe("PRAGMA quick_check;")
    .then((rows) => {
      const result =
        Array.isArray(rows) && rows[0] ? Object.values(rows[0])[0] : null;
      if (result && String(result).toLowerCase() !== "ok") {
        console.error("SQLite integrity check failed:", result);
        setRecoveryMode(true);
      } else {
        setRecoveryMode(false);
      }
    })
    .catch((error) => {
      console.warn("Failed to run PRAGMA quick_check", error);
      setRecoveryMode(true);
    });
} else {
  setRecoveryMode(false);
}

module.exports = prisma;
