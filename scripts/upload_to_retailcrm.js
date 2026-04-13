/**
 * Step 2: Upload mock_orders.json → RetailCRM
 * Usage: node upload_to_retailcrm.js
 * Env:   RETAILCRM_URL, RETAILCRM_API_KEY
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require("fs");
const https = require("https");
const url = require("url");

const CRM_URL = process.env.RETAILCRM_URL; // e.g. https://yourdemo.retailcrm.ru
const API_KEY = process.env.RETAILCRM_API_KEY;

if (!CRM_URL || !API_KEY) {
  console.error("❌  Set RETAILCRM_URL and RETAILCRM_API_KEY env vars");
  process.exit(1);
}

const orders = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../mock_orders.json'), "utf8"));
async function post(path, body) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ apiKey: API_KEY, order: JSON.stringify(body) });
    const payload = params.toString();
    const parsed = url.parse(`${CRM_URL}/api/v5${path}`);
    const options = {
      hostname: parsed.hostname,
      path: parsed.path,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  console.log(`📦  Uploading ${orders.length} orders to RetailCRM…`);
  let ok = 0,
    fail = 0;

  for (let i = 0; i < orders.length; i++) {
    const raw = orders[i];

    // Build RetailCRM order payload
    const order = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      phone: raw.phone,
      email: raw.email,
      orderMethod: raw.orderMethod,
      status: raw.status,
      items: raw.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        initialPrice: item.initialPrice,
      })),
      delivery: { address: raw.delivery.address },
      customFields: raw.customFields,
      // createdAt is auto-set by CRM
    };

    try {
      const res = await post("/orders/create", order);
      if (res.success) {
        ok++;
        console.log(`  ✅  [${i + 1}/${orders.length}] ${raw.firstName} ${raw.lastName} — id ${res.id}`);
      } else {
        fail++;
        console.warn(`  ⚠️  [${i + 1}] ${raw.firstName}: ${JSON.stringify(res.errors)}`);
      }
    } catch (e) {
      fail++;
      console.error(`  ❌  [${i + 1}] ${raw.firstName}: ${e.message}`);
    }

    // RetailCRM free tier: 20 req/s — stay safe
    await sleep(60);
  }

  console.log(`\n🎉  Done! OK: ${ok}  Failed: ${fail}`);
})();
