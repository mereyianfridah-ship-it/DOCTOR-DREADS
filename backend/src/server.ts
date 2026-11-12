import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { get, run, initDb, seedIfEmpty, sweepExpired, pool } from "./db.js";
import { createApp } from "./app.js";
import { nowIso } from "./lib/util.js";

let server: any;

async function bootstrap() {
  await initDb();
  await seedIfEmpty();

  // Bootstrap an admin from env on first start (idempotent).
  if (config.adminEmail && config.adminPassword.length >= 10) {
    const existing = await get("SELECT 1 FROM users WHERE email=$1", config.adminEmail);
    if (!existing) {
      await run("INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ('Admin',$1, '', $2, 'admin', $3)",
        config.adminEmail.toLowerCase(), bcrypt.hashSync(config.adminPassword, config.bcryptCost), nowIso());
      console.log(`Admin account created for ${config.adminEmail}`);
    }
  }

  const app = createApp();
  server = app.listen(config.port, "0.0.0.0", () =>
    console.log(`Dr Dread API on http://0.0.0.0:${config.port} (payments: ${config.payments.mode})`)
  );

  setInterval(() => sweepExpired().catch(console.error), 60_000).unref();

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}: shutting down gracefully`);
    server.close(() => {
      pool.end().then(() => {
        console.log("HTTP server and database pool closed");
        process.exit(0);
      });
    });
  };
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => shutdown(sig));
}

bootstrap().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});
