import "server-only";

// Plain email through Resend's HTTP API (no SDK). Does nothing until a
// verified sender is configured; callers treat "skipped" as normal.

const from = () => process.env.EMAIL_FROM || process.env.ORDER_FORMS_FROM;

export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY && from());
}

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export async function sendEmail(msg: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<"sent" | "skipped" | "failed"> {
  if (!emailReady() || !msg.to.length) return "skipped";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from(),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
