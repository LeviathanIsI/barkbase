const path = require("path");
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
require("express-async-errors");

const env = require("./config/env");
const prisma = require("./config/prisma");
const { getConnectionInfo } = require("./config/databaseUrl");
const readiness = require("./lib/readiness");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const { tenantResolver } = require("./middleware/tenantResolver");
const { tenantContext } = require("./middleware/tenantContext");
const { validateFileAccess } = require("./middleware/validateFileAccess");
const csrfProtection = require("./middleware/csrf");

const authRoutes = require("./routes/auth.routes");
const tenantRoutes = require("./routes/tenants.routes");
const petRoutes = require("./routes/pets.routes");
const ownerRoutes = require("./routes/owners.routes");
const bookingRoutes = require("./routes/bookings.routes");
const paymentRoutes = require("./routes/payments.routes");
const reportRoutes = require("./routes/reports.routes");
const adminRoutes = require("./routes/admin.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const kennelRoutes = require("./routes/kennels.routes");
const checkInRoutes = require("./routes/checkin.routes");
const staffRoutes = require("./routes/staff.routes");
const membershipRoutes = require("./routes/memberships.routes");
const inviteRoutes = require("./routes/invites.routes");
const incidentRoutes = require("./routes/incidents.routes");
const calendarRoutes = require("./routes/calendar.routes");
const upgradeRoutes = require("./routes/upgrade.routes");
const accountDefaultsRoutes = require("./routes/accountDefaults.routes");
const handlerFlowsRoutes = require("./routes/handlerFlows.routes");
const handlerRunsRoutes = require("./routes/handlerRuns.routes");
const eventsRoutes = require("./routes/events.routes");
const propertiesRoutes = require("./routes/properties.routes");
const associationsRoutes = require("./routes/associations.routes");
const facilityRoutes = require("./routes/facility.routes");
const userRoutes = require("./routes/user.routes");
const communicationRoutes = require("./routes/communication.routes");
const noteRoutes = require("./routes/note.routes");
const segmentRoutes = require("./routes/segment.routes");

const app = express();

app.set("trust proxy", 1);

app.use(
  tenantResolver({
    allowedHosts: env.tenancy.allowedHosts,
    defaultTenantSlug: env.tenancy.defaultSlug,
    baseDomain: env.tenancy.baseDomain,
  })
);
app.use(requestLogger);
app.use((req, res, next) => {
  if (req.recordId) {
    res.setHeader("X-Request-ID", req.recordId);
  }
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "blob:"],
      },
    },
  })
);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        env.cors.allowedOrigins.length === 0 ||
        env.cors.allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(csrfProtection());

// Secure file uploads with authentication and tenant validation
// Must authenticate users and validate they can only access their tenant's files
app.use("/uploads", tenantContext, validateFileAccess(), express.static(path.resolve(env.storage.root)));

const baseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(baseLimiter);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/tenants/upgrade", upgradeRoutes);
app.use("/api/v1/pets", petRoutes);
app.use("/api/v1/owners", ownerRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/kennels", kennelRoutes);
app.use("/api/v1/check-in", checkInRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/incidents", incidentRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/handler-flows", handlerFlowsRoutes);
app.use("/api/v1/handler-runs", handlerRunsRoutes);
app.use("/api/v1/account-defaults", accountDefaultsRoutes);
app.use("/api/v1/settings/properties", propertiesRoutes);
app.use("/api/v1/settings/associations", associationsRoutes);
app.use("/api/v1/facility", facilityRoutes);
app.use("/api/v1/communications", communicationRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/segments", segmentRoutes);
app.use("/users", userRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/health/db", async (_req, res) => {
  const ok = await prisma.healthCheck();
  readiness.setDbHealthy(ok);
  const meta = getConnectionInfo();
  if (ok) {
    return res.json({
      ok: true,
      host: meta.host,
      port: meta.port,
      pooler: meta.isPooler,
    });
  }
  return res.status(503).json({
    ok: false,
    host: meta.host,
    port: meta.port,
    pooler: meta.isPooler,
  });
});

app.get("/health/ready", (_req, res) => {
  const ready = readiness.isAppReady();
  const dbHealthy = readiness.isDbHealthy();
  const statusCode = ready ? 200 : 503;
  res.status(statusCode).json({ ok: ready, dbHealthy });
});

app.get("/healthz", (_req, res) => {
  const dbHealthy = readiness.isDbHealthy();
  const statusCode = dbHealthy ? 200 : 503;
  res.status(statusCode).send(dbHealthy ? "ok" : "db-unhealthy");
});

app.get("/readyz", (_req, res) => {
  const ready = readiness.isAppReady();
  res.status(ready ? 200 : 503).send(ready ? "ready" : "not-ready");
});

app.use(errorHandler);

module.exports = app;
