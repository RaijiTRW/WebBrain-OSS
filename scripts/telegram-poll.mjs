import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(envPath);

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const appOrigin = (process.env.WEBBRAIN_APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const shouldDeleteWebhook = process.env.TELEGRAM_POLL_DELETE_WEBHOOK !== "0";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing in .env.local");
  process.exit(1);
}

const telegramApi = `https://api.telegram.org/bot${token}`;
let offset = 0;
let isStopping = false;

async function callTelegram(method, body) {
  const response = await fetch(`${telegramApi}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${method} failed: ${response.status} ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function forwardUpdate(update) {
  const headers = { "Content-Type": "application/json" };
  if (webhookSecret) {
    headers["x-telegram-bot-api-secret-token"] = webhookSecret;
  }

  const response = await fetch(`${appOrigin}/api/telegram/webhook`, {
    method: "POST",
    headers,
    body: JSON.stringify(update)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`local webhook failed: ${response.status} ${text.slice(0, 200)}`);
  }

  const result = await response.json().catch(() => null);
  if (result?.handledStart) {
    console.log(
      `Local webhook handled /start: reply ${result.replySent ? "sent" : `not sent (${result.replyReason || "unknown"})`}`
    );

    if (!result.replySent && result.replyText && update.message?.chat?.id) {
      const fallback = await callTelegram("sendMessage", {
        chat_id: update.message.chat.id,
        text: result.replyText,
        parse_mode: "HTML",
        disable_web_page_preview: true
      });

      console.log(`Polling fallback reply: ${fallback.ok ? "sent" : "not sent"}`);
    }
  }
}

async function pollOnce() {
  const data = await callTelegram("getUpdates", {
    offset,
    timeout: 25,
    allowed_updates: ["message"]
  });

  const updates = Array.isArray(data.result) ? data.result : [];
  for (const update of updates) {
    offset = update.update_id + 1;
    const text = update.message?.text;
    console.log(`Telegram update received: ${text?.startsWith("/start") ? "/start" : "message"}`);
    await forwardUpdate(update);
  }
}

async function main() {
  if (shouldDeleteWebhook) {
    await callTelegram("deleteWebhook", { drop_pending_updates: false });
  }

  console.log(`Telegram polling started -> ${appOrigin}/api/telegram/webhook`);

  while (!isStopping) {
    try {
      await pollOnce();
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

process.on("SIGINT", () => {
  isStopping = true;
});

process.on("SIGTERM", () => {
  isStopping = true;
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
