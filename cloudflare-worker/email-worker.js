/**
 * RoxyMail — Cloudflare Email Worker
 * Catches all emails sent to *@roxystore.my.id (catch-all)
 * and forwards them to the FastAPI backend webhook.
 */
export default {
  async email(message, env, ctx) {
    try {
      // 1. Read raw email content
      const rawEmail = await new Response(message.raw).text();

      // 2. Extract basic metadata from headers
      const from = message.from;
      const to = message.to;
      const subject = message.headers.get("subject") || "(no subject)";
      const date = message.headers.get("date") || new Date().toISOString();
      const msgId =
        message.headers.get("message-id") || crypto.randomUUID();

      // 3. POST raw email to FastAPI backend webhook
      const response = await fetch(env.BACKEND_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": env.WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          raw_email: rawEmail,
          from: from,
          to: to,
          subject: subject,
          date: date,
          message_id: msgId,
        }),
      });

      if (!response.ok) {
        // Forward to fallback email if webhook fails
        await message.forward(env.FALLBACK_EMAIL);
        console.error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Email worker error:", error);
      // Forward to fallback so no email is lost
      await message.forward(env.FALLBACK_EMAIL);
    }
  },
};
