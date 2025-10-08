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
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const { tenantResolver } = require("./middleware/tenantResolver");
const csrfProtection = require("./middleware/csrf");

const authRoutes = require("./routes/auth.routes");
const tenantRoutes = require("./routes/tenants.routes");
const petRoutes = require("./routes/pets.routes");
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
  if (req.id) {
    res.setHeader("X-Request-ID", req.id);
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
app.use("/uploads", express.static(path.resolve(env.storage.root)));

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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/readyz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).send("ready");
  } catch (error) {
    return res.status(503).send("not-ready");
  }
});

app.use(errorHandler);

module.exports = app;
