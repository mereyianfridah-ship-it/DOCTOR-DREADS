import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
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
import { adminRouter, tiktokPublicRouter } from "./routes/admin.js";
import { uploadsRouter } from "./routes/uploads.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  
  // Trust proxy is needed on Render so secure cookies work
  app.set("trust proxy", 1);
  
  app.use(helmet());
  
  // Dynamic CORS configuration
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow the origins specified in your .env config
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) {
        return callback(null, true);
      }
      
      // Optionally, you can also allow any origin ending with .vercel.app for testing
      // if (origin.endsWith(".vercel.app")) return callback(null, true);

      console.warn(`Blocked by CORS: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }));

  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  
  if (!config.isTest) {
    app.use("/api", rateLimit({ 
      windowMs: 60_000, 
      limit: 300, 
      standardHeaders: true, 
      legacyHeaders: false, 
      message: { error: "Too many requests" } 
    }));
  }

  app.get("/api/health", async (_req, res) => { 
    await get("SELECT 1"); 
    res.json({ ok: true, payments: config.payments.mode }); 
  });

  app.use("/api/auth", authRouter);
  app.use("/api", catalogRouter, bookingsRouter, ordersRouter, consultationsRouter, contactRouter, paymentsRouter, accountRouter, adminRouter, uploadsRouter, tiktokPublicRouter);
  
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));
  app.use(errorHandler);
  
  return app;
}