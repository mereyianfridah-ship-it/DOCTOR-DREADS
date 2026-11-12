const fs = require("fs");
let c = fs.readFileSync("vitest_results.txt", "utf16le");
c = c.replace(/\x00/g, "");
const lines = c.split("\n");
for (const l of lines) {
  const t = l.trim();
  if (t.includes("Tests ") && t.includes("passed")) console.log("SUMMARY:", t);
  if (t.includes("Test Files")) console.log("FILES:", t);
  if (t.includes("FAIL")) console.log("FAIL:", t);
}