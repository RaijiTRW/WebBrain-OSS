import { NextRequest, NextResponse } from "next/server";

import { attachTelegramToBetaLead, findBetaLeadByStartToken } from "@/lib/beta-leads";
import { buildBetaConfirmationMessage, sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";

type TelegramMessage = {
  text?: string;
  from?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat?: {
    id?: number;
    type?: string;
  };
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

function parseStartToken(text: string) {
  const parts = text.split(/\s+/);
  const payload = parts[1]?.trim();

  if (!payload || !payload.startsWith("beta_")) return null;

  return payload;
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (configuredSecret) {
    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (receivedSecret !== configuredSecret) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;

  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = update.message;
  const text = message?.text?.trim() || "";
  let handledStart = false;
  let replySent = false;
  let replyReason: string | null = null;
  let replyText: string | null = null;

  if (message && text.startsWith("/start")) {
    handledStart = true;
    const startToken = parseStartToken(text);

    if (startToken && message.chat?.id) {
      const { lead } = await findBetaLeadByStartToken(startToken);

      if (lead) {
        await attachTelegramToBetaLead(startToken, {
          chatId: message.chat.id,
          userId: message.from?.id,
          username: message.from?.username,
          firstName: message.from?.first_name,
          lastName: message.from?.last_name
        });

        replyText = buildBetaConfirmationMessage(lead.email);
        const response = await sendTelegramMessage(message.chat.id, replyText);
        replySent = response.sent;
        replyReason = response.sent ? null : response.reason ?? "telegram_send_failed";
      } else {
        replyText = [
          "Привет! Я бот WebBrain.",
          "",
          "Заявку лучше оставить на сайте, чтобы я смог привязать вашу почту к бета-доступу."
        ].join("\n");
        const response = await sendTelegramMessage(message.chat.id, replyText);
        replySent = response.sent;
        replyReason = response.sent ? null : response.reason ?? "telegram_send_failed";
      }
    } else if (message.chat?.id) {
      replyText = [
        "Привет! Я бот WebBrain.",
        "",
        "Оставьте почту на сайте, и после заявки я подтвержу запись на бету здесь."
      ].join("\n");
      const response = await sendTelegramMessage(message.chat.id, replyText);
      replySent = response.sent;
      replyReason = response.sent ? null : response.reason ?? "telegram_send_failed";
    }
  }

  return NextResponse.json({ ok: true, handledStart, replySent, replyReason, replyText });
}
