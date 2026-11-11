import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { get, run, initDb, seedIfEmpty, sweepExpired } from "./db.js";
import { createApp } from "./app.js";
import { nowIso } from "./lib/util.js";

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

  setInterval(() => sweepExpired().catch(console.error), 60_000).unref();
  createApp().listen(config.port, () => console.log(`Dr Dread API on http://localhost:${config.port} (payments: ${config.payments.mode})`));
}

bootstrap().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});
