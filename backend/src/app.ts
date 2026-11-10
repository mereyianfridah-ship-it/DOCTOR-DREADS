import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { get } from "./db.js";
import { errorHandler, HttpError } from "./lib/errors.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { bookingsRouter } from "./routes/bookings.js";
import { ordersRouter } from "./routes/orders.js";
import { consultationsRouter } from "./routes/consultations.js";
import { contactRouter } from "./routes/contact.js";
import { paymentsRouter } from "./routes/payments.js";
import { accountRouter } from "./routes/account.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.isProd ? 1 : false);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: false }));
  app.use(express.json({ limit: "100kb" }));
  if (!config.isTest) app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests" } }));

  app.get("/api/health", (_req, res) => { get("SELECT 1"); res.json({ ok: true, payments: config.payments.mode }); });
  app.use("/api/auth", authRouter);
  app.use("/api", catalogRouter, bookingsRouter, ordersRouter, consultationsRouter, contactRouter, paymentsRouter, accountRouter, adminRouter);
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));
  app.use(errorHandler);
  return app;
}
