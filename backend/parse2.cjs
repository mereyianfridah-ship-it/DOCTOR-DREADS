const fs = require("fs");
let c = fs.readFileSync("vitest_results.txt", "utf16le").replace(/\x00/g, "");
const lines = c.split("\n");
let inMpesa = false;
for (const l of lines) {
  if (l.includes("mpesa.test.ts")) inMpesa = true;
  if (l.includes("api.test.ts")) inMpesa = false;
  if (inMpesa && (l.includes("Error") || l.includes("expected") || l.includes("Received") || l.includes("404") || l.includes("500") || l.includes("400") || l.includes("failed"))) {
    console.log(l.trim().substring(0, 200));
  }
}