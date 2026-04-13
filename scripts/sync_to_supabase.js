/**
 * Step 3: RetailCRM → Supabase sync
 * Usage: node sync_to_supabase.js
 * Env:   RETAILCRM_URL, RETAILCRM_API_KEY,
 *        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run once manually, or add to a cron / Vercel cron job.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require("https");
const url = require("url");

const CRM_URL = process.env.RETAILCRM_URL;
const API_KEY = process.env.RETAILCRM_API_KEY;
const SB_URL = process.env.SUPABASE_URL; // https://xxxx.supabase.co
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CRM_URL || !API_KEY || !SB_URL || !SB_KEY) {
  console.error("❌  Missing env vars. Need: RETAILCRM_URL, RETAILCRM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function httpGet(fullUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(fullUrl);
    const options = { hostname: parsed.hostname, path: parsed.path, method: "GET", headers };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function httpPost(fullUrl, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = url.parse(fullUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.path,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── fetch all orders from RetailCRM ─────────────────────────────────────────

async function fetchAllCRMOrders() {
  let page = 1;
  let allOrders = [];
  while (true) {
    const res = await httpGet(
      `${CRM_URL}/api/v5/orders?apiKey=${API_KEY}&limit=100&page=${page}`
    );
    if (!res.success) throw new Error("CRM error: " + JSON.stringify(res));
    const orders = res.orders || [];
    allOrders = allOrders.concat(orders);
    if (allOrders.length >= res.pagination.totalCount) break;
    page++;
    await new Promise((r) => setTimeout(r, 100));
  }
  return allOrders;
}

// ── transform CRM order → Supabase row ──────────────────────────────────────

function transform(o) {
  const total = (o.items || []).reduce(
    (sum, i) => sum + (i.initialPrice || 0) * (i.quantity || 1),
    0
  );
  return {
    crm_id: String(o.id),
    first_name: o.firstName || "",
    last_name: o.lastName || "",
    phone: o.phone || "",
    email: o.email || "",
    status: o.status || "new",
    total_price: total,
    city: o.delivery?.address?.city || "",
    utm_source: o.customFields?.utm_source || "",
    created_at: o.createdAt || new Date().toISOString(),
    items_json: JSON.stringify(o.items || []),
  };
}

// ── upsert rows into Supabase ────────────────────────────────────────────────

async function upsertToSupabase(rows) {
  const res = await httpPost(
    `${SB_URL}/rest/v1/orders`,
    rows,
    {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: "resolution=merge-duplicates",
    }
  );
  return res;
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("🔄  Fetching orders from RetailCRM…");
  const crmOrders = await fetchAllCRMOrders();
  console.log(`   Found ${crmOrders.length} orders`);

  const rows = crmOrders.map(transform);

  console.log("📤  Upserting to Supabase…");
  const result = await upsertToSupabase(rows);

  if (result.status >= 200 && result.status < 300) {
    console.log(`✅  Synced ${rows.length} rows (HTTP ${result.status})`);
  } else {
    console.error(`❌  Supabase error (HTTP ${result.status}):`, result.body);
    process.exit(1);
  }
})();
