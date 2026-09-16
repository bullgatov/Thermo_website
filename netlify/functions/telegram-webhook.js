/**
 * Telegram webhook: reply to a "New service request" message with a field name
 * (e.g. "name", "phone") to get that value extracted back into the chat.
 *
 * Setup (once per deploy URL):
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url":"https://YOUR_SITE.netlify.app/.netlify/functions/telegram-webhook","secret_token":"YOUR_SECRET"}'
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, optional TELEGRAM_WEBHOOK_SECRET
 */

const {
  parseServiceRequest,
  normalizeCommand,
  buildCommandReply,
  COMMAND_HELP,
} = require("./lib/service-request-message");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function headerValue(headers, name) {
  if (!headers) return "";
  var want = name.toLowerCase();
  var keys = Object.keys(headers);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === want) {
      return headers[keys[i]] || "";
    }
  }
  return "";
}

function chatIdMatches(configured, chat) {
  var conf = String(configured || "").trim();
  if (!conf || !chat) return false;
  if (conf === String(chat.id)) return true;
  var username = chat.username ? String(chat.username).trim() : "";
  if (!username) return false;
  var confName = conf.charAt(0) === "@" ? conf.slice(1) : conf;
  return confName.toLowerCase() === username.toLowerCase();
}

async function sendTelegramMessage(token, payload) {
  const res = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(function () {
    return null;
  });
  if (!res.ok || !data || !data.ok) {
    console.error("Telegram sendMessage error:", data);
    return false;
  }
  return true;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return jsonResponse(500, { ok: false, error: "Server configuration error" });
  }

  if (webhookSecret) {
    const headerSecret = headerValue(event.headers, "x-telegram-bot-api-secret-token");
    if (headerSecret !== webhookSecret) {
      console.error("Telegram webhook secret mismatch or missing header");
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }
  }

  let update;
  try {
    update = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON" });
  }

  const message = update.message || update.edited_message;
  if (!message || !message.chat) {
    return jsonResponse(200, { ok: true, ignored: "no_message" });
  }

  const replyTo = message.reply_to_message;
  const rawText = typeof message.text === "string" ? message.text : "";
  const looksLikeRequest = !!(replyTo && parseServiceRequest(replyTo.text || ""));

  if (!chatIdMatches(chatId, message.chat) && !looksLikeRequest) {
    console.error("chat_mismatch incoming=", message.chat && message.chat.id, "configured=", chatId);
    return jsonResponse(200, { ok: true, ignored: "chat_mismatch" });
  }

  if (!replyTo || typeof replyTo.text !== "string") {
    const command = normalizeCommand(rawText);
    if (command === "help" || command === "start" || command === "commands") {
      await sendTelegramMessage(token, {
        chat_id: message.chat.id,
        text: COMMAND_HELP,
        reply_to_message_id: message.message_id,
        disable_web_page_preview: true,
      });
    }
    return jsonResponse(200, { ok: true, ignored: "not_a_reply" });
  }

  const parsed = parseServiceRequest(replyTo.text);
  if (!parsed) {
    await sendTelegramMessage(token, {
      chat_id: message.chat.id,
      text:
        "Reply only to a message that starts with:\nNew service request - Thermo Appliance Repair",
      reply_to_message_id: message.message_id,
      disable_web_page_preview: true,
    });
    return jsonResponse(200, { ok: true, handled: "not_service_request" });
  }

  const command = normalizeCommand(rawText);
  if (!command) {
    await sendTelegramMessage(token, {
      chat_id: message.chat.id,
      text: COMMAND_HELP,
      reply_to_message_id: message.message_id,
      disable_web_page_preview: true,
    });
    return jsonResponse(200, { ok: true, handled: "empty_command" });
  }

  const replyText = buildCommandReply(parsed, command);

  await sendTelegramMessage(token, {
    chat_id: message.chat.id,
    text: replyText,
    reply_to_message_id: message.message_id,
    disable_web_page_preview: true,
  });

  return jsonResponse(200, { ok: true, handled: "command", command: command });
};
