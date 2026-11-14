#!/usr/bin/env node
/**
 * Downloads real, description-matched photos from Pexels into public/images/photos/
 * so the site serves them itself (no hot-linking, no random results, works offline).
 *
 * Usage (Node 18+):
 *   1. Get a free API key: https://www.pexels.com/api/
 *   2. PEXELS_API_KEY=your_key npm run photos        (Windows PowerShell: $env:PEXELS_API_KEY="your_key"; npm run photos)
 *   3. Commit public/images/photos/ and redeploy.
 *
 * Re-run any time. Existing files are kept unless you pass --force.
 * To change a photo, edit its query below (or just drop your own <slot>.jpg into the folder).
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KEY = process.env.PEXELS_API_KEY;
const FORCE = process.argv.includes("--force");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "images", "photos");

if (!KEY) {
  console.error("Missing PEXELS_API_KEY. Get a free key at https://www.pexels.com/api/ then run:\n  PEXELS_API_KEY=xxxx npm run photos");
  process.exit(1);
}

/** slot -> [search query, orientation]. Slots sharing a query get different photos. */
const SLOTS = {
  hero: ["woman with dreadlocks hairstyle", "landscape"],
  about: ["hair salon stylist working", "portrait"],
  "about-2": ["hairstylist hands styling locs", "portrait"],

  "service-installation": ["black woman locs hairstyle", "portrait"],
  "service-retouching": ["hairstylist twisting dreadlocks", "portrait"],
  "service-maintenance": ["woman long locs hair care", "portrait"],
  "service-styling": ["locs updo hairstyle woman", "portrait"],
  "service-natural": ["natural afro hair black woman", "portrait"],
  "service-repair": ["hairdresser dreadlocks salon", "portrait"],
  "service-event": ["elegant locs hairstyle woman", "portrait"],
  "service-treatment": ["natural hair care black woman curls", "portrait"],

  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`gallery-locs-${n}`, ["dreadlocks hairstyle", "portrait"]])),
  ...Object.fromEntries([1, 2, 3].map((n) => [`gallery-natural-${n}`, ["afro natural hair", "portrait"]])),
  ...Object.fromEntries([1, 2, 3].map((n) => [`gallery-salon-${n}`, ["hair salon interior", "portrait"]])),
  ...Object.fromEntries([1, 2, 3].map((n) => [`gallery-braids-${n}`, ["braids hairstyle black woman", "portrait"]])),

  ...Object.fromEntries([1, 2, 3].map((n) => [`product-moisturizer-${n}`, ["hair cream jar", "square"]])),
  ...Object.fromEntries([1, 2, 3].map((n) => [`product-gel-${n}`, ["hair gel pomade jar", "square"]])),
  ...Object.fromEntries([1, 2, 3].map((n) => [`product-oil-${n}`, ["hair oil bottle dropper", "square"]])),
  "product-comb": ["wooden hair comb", "square"],
  "product-bonnet": ["satin hair bonnet", "square"],
  "product-headband": ["hair headband accessory", "square"],

  ...Object.fromEntries([1, 2, 3, 4].map((n) => [`avatar-${n}`, ["smiling black woman portrait", "square"]])),
};

const used = new Set();
const credits = {};
const exists = (p) => access(p).then(() => true, () => false);

async function search(query, orientation) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30&orientation=${orientation}`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} for "${query}"`);
  return (await res.json()).photos ?? [];
}

await mkdir(OUT, { recursive: true });
const cache = new Map();
let ok = 0;
const failed = [];

for (const [slot, [query, orientation]] of Object.entries(SLOTS)) {
  const file = path.join(OUT, `${slot}.jpg`);
  if (!FORCE && (await exists(file))) { console.log(`skip   ${slot}`); continue; }
  try {
    const k = `${query}|${orientation}`;
    if (!cache.has(k)) cache.set(k, await search(query, orientation));
    const photo = cache.get(k).find((p) => !used.has(p.id));
    if (!photo) throw new Error("no unused result");
    used.add(photo.id);
    const src = orientation === "landscape" ? photo.src.large2x : photo.src.large;
    const img = await fetch(src);
    if (!img.ok) throw new Error(`download ${img.status}`);
    await writeFile(file, Buffer.from(await img.arrayBuffer()));
    credits[slot] = { query, photographer: photo.photographer, url: photo.url };
    console.log(`saved  ${slot}  <- "${query}" by ${photo.photographer}`);
    ok++;
  } catch (e) {
    failed.push(slot);
    console.warn(`FAILED ${slot}: ${e.message}`);
  }
}

if (ok) await writeFile(path.join(OUT, "credits.json"), JSON.stringify(credits, null, 2));
console.log(`\nDone: ${ok} saved, ${failed.length} failed.${failed.length ? " Failed slots fall back to the SVG placeholder." : ""}`);
