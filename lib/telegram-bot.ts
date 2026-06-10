export async function sendTelegramMessage(chatId: string | number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    return { sent: false, reason: "telegram_not_configured" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return { sent: false, reason: "telegram_send_failed", details: details.slice(0, 300) };
  }

  return { sent: true };
}

export function buildBetaConfirmationMessage(email: string) {
  return [
    `Готово, вы записаны на бету WebBrain на почту ${email}.`,
    "",
    "Мы напишем сюда и на почту, когда откроем вам доступ к бете."
  ].join("\n");
}
