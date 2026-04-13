/**
 * Step 5: Telegram bot — notify on orders > 50 000 ₸
 *
 * Two modes:
 *  A) Webhook  – deploy as /api/webhook.js on Vercel (receives RetailCRM webhooks)
 *  B) Polling  – run locally: node telegram_bot.js --poll
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN   – from @BotFather
 *   TELEGRAM_CHAT_ID     – your chat / group id (use @userinfobot to find)
 *   RETAILCRM_URL        – for polling mode
 *   RETAILCRM_API_KEY    – for polling mode
 */

const https = require("https");
const url = require("url");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const THRESHOLD = 50000; // ₸

// ── Telegram sender ──────────────────────────────────────────────────────────

function sendTelegramMessage(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" });
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
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

// ── Format notification ──────────────────────────────────────────────────────

function formatOrder(order) {
  const total = (order.items || []).reduce(
    (s, i) => s + (i.initialPrice || 0) * (i.quantity || 1),
    0
  );
  const items = (order.items || [])
    .map((i) => `  • ${i.productName} × ${i.quantity} = ${(i.initialPrice * i.quantity).toLocaleString("ru")} ₸`)
    .join("\n");
  const city = order.delivery?.address?.city || "—";
  const src = order.customFields?.utm_source || "—";

  return (
    `🔔 <b>Крупный заказ!</b>\n` +
    `👤 ${order.firstName} ${order.lastName}\n` +
    `📍 ${city}\n` +
    `📱 ${order.phone}\n` +
    `📦 Товары:\n${items}\n` +
    `💰 <b>Итого: ${total.toLocaleString("ru")} ₸</b>\n` +
    `📊 Источник: ${src}\n` +
    `🆔 CRM ID: ${order.id}`
  );
}

// ── Webhook handler (Vercel serverless) ─────────────────────────────────────
// RetailCRM → Settings → Webhooks → URL: https://your-vercel.app/api/webhook
// Events: Order create, Order update

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const body = req.body || {};
    const order = body.order;

    if (!order) return res.status(200).json({ ok: true, skipped: "no order" });

    const total = (order.items || []).reduce(
      (s, i) => s + (i.initialPrice || 0) * (i.quantity || 1),
      0
    );

    if (total > THRESHOLD) {
      await sendTelegramMessage(formatOrder(order));
      console.log(`Notified: order ${order.id} — ${total} ₸`);
    }

    return res.status(200).json({ ok: true, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

// ── Polling mode (local testing) ─────────────────────────────────────────────

if (require.main === module && process.argv.includes("--poll")) {
  const CRM_URL = process.env.RETAILCRM_URL;
  const API_KEY = process.env.RETAILCRM_API_KEY;

  if (!CRM_URL || !API_KEY || !BOT_TOKEN || !CHAT_ID) {
    console.error("❌  Set all env vars (see top of file)");
    process.exit(1);
  }

  let lastChecked = new Date(Date.now() - 60_000).toISOString();

  async function poll() {
    const since = lastChecked;
    lastChecked = new Date().toISOString();

    const reqUrl = `${CRM_URL}/api/v5/orders?apiKey=${API_KEY}&filter[createdAtFrom]=${encodeURIComponent(since)}&limit=100`;

    https.get(reqUrl, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", async () => {
        try {
          const json = JSON.parse(data);
          for (const order of json.orders || []) {
            const total = (order.items || []).reduce(
              (s, i) => s + (i.initialPrice || 0) * (i.quantity || 1),
              0
            );
            if (total > THRESHOLD) {
              console.log(`🔔 Big order found: ${order.id} — ${total} ₸`);
              await sendTelegramMessage(formatOrder(order));
            }
          }
        } catch (e) {
          console.error("Poll error:", e.message);
        }
      });
    }).on("error", console.error);
  }

  console.log("🤖  Bot polling started (checking every 30s)…");
  poll();
  setInterval(poll, 30_000);
}
