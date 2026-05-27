// One-shot screenshot capture for the AJE-12 prototype.
// Run via: npx -y puppeteer node capture.mjs
// Captures 4 states from http://localhost:8100/ (the local preview server)
// and writes JPEGs into this folder.
//
// Not committed to keep the repo small? It's tiny — leave it for repeatability.

import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.SCREENSHOT_URL || "http://localhost:8100/";

// All shots screenshot the phone element only (cropped via clip), so the
// popup is centered and the page chrome doesn't dominate.
const shots = [
  {
    file: "A-sufficient.png",
    label: "Variant A · sufficient",
    variant: "A",
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelector('[data-variant="A"] [data-sound-id="forest-rain"]').click();
      });
      await new Promise(r => setTimeout(r, 700));
    },
  },
  {
    file: "A-insufficient.png",
    label: "Variant A · insufficient",
    variant: "A",
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelector('.sim-btn[data-target="A"][data-balance="20"]').click();
        document.querySelector('[data-variant="A"] [data-sound-id="mountain-wind"]').click();
      });
      await new Promise(r => setTimeout(r, 700));
    },
  },
  {
    file: "B-sufficient.png",
    label: "Variant B · sufficient",
    variant: "B",
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelector('[data-variant="B"] [data-sound-id="forest-rain"]').click();
      });
      await new Promise(r => setTimeout(r, 700));
    },
  },
  {
    file: "B-insufficient.png",
    label: "Variant B · insufficient",
    variant: "B",
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelector('.sim-btn[data-target="B"][data-balance="20"]').click();
        document.querySelector('[data-variant="B"] [data-sound-id="mountain-wind"]').click();
      });
      await new Promise(r => setTimeout(r, 700));
    },
  },
];

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

for (const s of shots) {
  const page = await browser.newPage();
  // Wide-and-tall viewport so the phone fits without cropping; we'll clip to it.
  await page.setViewport({ width: 1024, height: 1500, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  // Hide the floating telemetry panel — it would block the popup.
  await page.evaluate(() => {
    document.getElementById('telemetryPanel').style.display = 'none';
  });
  await s.setup(page);
  // Compute the phone bounding box for this variant and clip to it (with padding).
  const clip = await page.evaluate((variant) => {
    const phone = document.querySelector(`[data-variant="${variant}"]`).closest('.phone');
    const r = phone.getBoundingClientRect();
    const pad = 24;
    return {
      x: Math.max(0, Math.round(r.left - pad)),
      y: Math.max(0, Math.round(r.top - pad)),
      width: Math.round(r.width + pad * 2),
      height: Math.round(r.height + pad * 2),
    };
  }, s.variant);
  const out = path.join(__dirname, s.file);
  await page.screenshot({ path: out, type: "png", clip });
  console.log(`✓ ${s.label} → ${out}`);
  await page.close();
}

await browser.close();
