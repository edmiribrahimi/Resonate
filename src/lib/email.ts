import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when env vars are missing
let _resend: Resend | null = null;
export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    content_type: string;
  }>;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";
  const { data, error } = await getResend().emails.send({
    from: fromAddress,
    to: [to],
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });

  if (error) {
    console.error("Email send failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
