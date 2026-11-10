/** Regenerates seed/*.json from the frontend demo data (../src/data). Run: npm run seed:generate */
import { writeFileSync } from "node:fs";
import { services } from "../../src/data/services";
import { products } from "../../src/data/products";
import { galleryItems } from "../../src/data/gallery";
import { testimonials } from "../../src/data/testimonials";
import { siteConfig, stylists } from "../../src/config/site";

const out = (name: string, data: unknown) =>
  writeFileSync(new URL(`../seed/${name}.json`, import.meta.url), JSON.stringify(data, null, 2) + "\n");
out("services", services);
out("products", products);
out("gallery", galleryItems);
out("testimonials", testimonials);
out("site", { booking: siteConfig.booking, checkout: siteConfig.checkout, stylists });
console.log("seed written");
