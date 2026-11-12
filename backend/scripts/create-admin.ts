/** Usage: npm run create-admin -- you@example.com 'a-long-password' */
import bcrypt from "bcryptjs";
import { get, run } from "../src/db.js";
import { config } from "../src/config.js";

const [email, pw] = process.argv.slice(2);
if (!email || !pw || pw.length < 10) { console.error("Usage: create-admin <email> <password (10+ chars)>"); process.exit(1); }
const hash = bcrypt.hashSync(pw, config.bcryptCost);
if (await get("SELECT 1 FROM users WHERE email=?", email)) run("UPDATE users SET role='admin', password_hash=? WHERE email=?", hash, email);
else run("INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ('Admin',?, '', ?, 'admin', ?)", email.toLowerCase(), hash, new Date().toISOString());
console.log(`Admin ready: ${email}`);
