import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { get, run, sweepExpired } from "./db.js";
import { createApp } from "./app.js";
import { nowIso } from "./lib/util.js";

// Bootstrap an admin from env on first start (idempotent).
if (config.adminEmail && config.adminPassword.length >= 10 && !get("SELECT 1 FROM users WHERE email=?", config.adminEmail)) {
  run("INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ('Admin',?, '', ?, 'admin', ?)",
    config.adminEmail.toLowerCase(), bcrypt.hashSync(config.adminPassword, config.bcryptCost), nowIso());
  console.log(`Admin account created for ${config.adminEmail}`);
}

setInterval(sweepExpired, 60_000).unref();
createApp().listen(config.port, () => console.log(`Dr Dread API on http://localhost:${config.port} (payments: ${config.payments.mode})`));
