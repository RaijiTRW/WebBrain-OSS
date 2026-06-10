import { NextRequest, NextResponse } from "next/server";

import { buildTelegramBotUrl, createOrUpdateBetaLead, getBetaLeadStats, markBetaLeadAdminNotified } from "@/lib/beta-leads";
import { buildBetaConfirmationMessage, sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";

const DEFAULT_ADMIN_USERNAME = "@aleksey_gredasov_ai";

type BetaRequestBody = {
  email?: unknown;
  source?: unknown;
  page?: unknown;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendKnownUserConfirmation(email: string, chatId?: number | null) {
  if (!chatId) {
    return { sent: false, reason: "telegram_user_chat_unknown" };
  }

  return sendTelegramMessage(chatId, buildBetaConfirmationMessage(email));
}

export async function POST(request: NextRequest) {
  let body: BetaRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source.slice(0, 500) : "";
  const page = typeof body.page === "string" ? body.page.slice(0, 120) : "landing-beta";
  const adminUsername = process.env.TELEGRAM_ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME;
  const statsBefore = await getBetaLeadStats();

  if (statsBefore.isFull) {
    return NextResponse.json({
      message: "Beta list is full",
      telegramBotUrl: buildTelegramBotUrl(),
      ...statsBefore
    }, { status: 409 });
  }

  const leadResult = await createOrUpdateBetaLead({ email, source, page });
  const telegramBotUrl = buildTelegramBotUrl(leadResult.startToken ?? undefined);
  const position = leadResult.lead?.position ?? statsBefore.nextPosition;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

  if (!token || !chatId) {
    return NextResponse.json({
      ok: true,
      telegramSent: false,
      telegramBotUrl,
      reason: "telegram_not_configured",
      adminUsername,
      leadSaved: Boolean(leadResult.lead),
      leadError: leadResult.error,
      position
    });
  }

  const text = [
    "🟢 <b>Новая заявка WebBrain beta</b>",
    "",
    `<b>Email:</b> ${escapeHtml(email)}`,
    `<b>Страница:</b> ${escapeHtml(page)}`,
    source ? `<b>Источник:</b> ${escapeHtml(source)}` : "",
    leadResult.lead ? `<b>Lead ID:</b> ${escapeHtml(leadResult.lead.id)}` : "",
    leadResult.error ? `<b>Lead storage:</b> ${escapeHtml(leadResult.error)}` : "",
    "",
    `<b>Админ:</b> ${escapeHtml(adminUsername)}`
  ].filter(Boolean).join("\n");

  const telegramResponse = await sendTelegramMessage(chatId, text);

  if (!telegramResponse.sent) {
    return NextResponse.json({
      ok: true,
      telegramSent: false,
      telegramBotUrl,
      reason: "telegram_send_failed",
      details: telegramResponse.details,
      leadSaved: Boolean(leadResult.lead),
      leadError: leadResult.error,
      position
    });
  }

  await markBetaLeadAdminNotified(email);
  const userConfirmation = await sendKnownUserConfirmation(email, leadResult.lead?.telegram_chat_id);

  return NextResponse.json({
    ok: true,
    telegramSent: true,
    userTelegramSent: userConfirmation.sent,
    userTelegramReason: userConfirmation.sent ? null : userConfirmation.reason,
    telegramBotUrl,
    leadSaved: Boolean(leadResult.lead),
    leadError: leadResult.error,
    position
  });
}
