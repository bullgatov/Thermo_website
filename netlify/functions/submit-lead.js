/**
 * Netlify Function: accepts JSON from the booking form and sends Telegram sendMessage.
 * Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Netlify -> Site settings -> Environment variables.
 */

const MAX_ISSUE_LEN = 3500;

function jsonResponse(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(body),
  };
}

function trim(str) {
  return typeof str === "string" ? str.trim() : "";
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*" } };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return jsonResponse(500, { ok: false, error: "Server configuration error" });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON" });
  }

  const name = trim(data.name);
  const phone = trim(data.phone);
  const email = trim(data.email);
  const address = trim(data.address);
  const city = trim(data.city);
  const state = trim(data.state);
  const zip = trim(data.zip);
  const appliance = trim(data.appliance);
  const brandModel = trim(data.brand_model);
  let issue = trim(data.issue);
  const preferredDate = trim(data.preferred_date);
  const windowPref = trim(data.window);

  if (!name || !phone || !address || !city || !state || !zip || !appliance || !issue) {
    return jsonResponse(400, { ok: false, error: "Missing required fields" });
  }

  if (!/^\d{5}$/.test(zip)) {
    return jsonResponse(400, { ok: false, error: "Invalid ZIP code" });
  }

  if (issue.length > MAX_ISSUE_LEN) {
    issue = issue.slice(0, MAX_ISSUE_LEN) + "\u2026";
  }

  const lines = [
    "New service request - Thermo Appliance Repair",
    "",
    "Name: " + name,
    "Phone: " + phone,
    "Email: " + (email || "-"),
    "",
    "Address: " + address,
    "City: " + city + ", " + state + " " + zip,
    "",
    "Appliance: " + appliance,
    "Brand / model: " + (brandModel || "-"),
    "",
    "Issue:",
    issue,
    "",
    "Preferred date: " + (preferredDate || "-"),
    "Preferred window: " + (windowPref || "Any"),
  ];

  const text = lines.join("\n");

  let tgRes;
  try {
    tgRes = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("Telegram fetch error:", err);
    return jsonResponse(502, { ok: false, error: "Could not reach Telegram" });
  }

  const tgJson = await tgRes.json().catch(function () {
    return null;
  });

  if (!tgRes.ok || !tgJson || !tgJson.ok) {
    console.error("Telegram API error:", tgJson);
    return jsonResponse(502, {
      ok: false,
      error: "Telegram rejected the message",
    });
  }

  return jsonResponse(200, { ok: true });
};
