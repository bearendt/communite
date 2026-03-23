// apps/web/lib/notifications.ts
// All outbound notifications for Communitē.
// Email via Resend. Push via Expo Push API.
// Falls back to console log in dev if keys not set.

// ============================================================
// SHARED EMAIL HELPER
// ============================================================

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
};

async function sendEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Email DEV]", payload.subject, "→", payload.to);
      return;
    }
    console.error("[Email] RESEND_API_KEY not set — email dropped:", payload.subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from ?? "Communitē <noreply@communite.app>",
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    console.error("[Resend] Error:", await res.text());
  }
}

// ============================================================
// ADMIN SAFETY ALERTS
// ============================================================

type AdminNotification =
  | {
      type: "CRITICAL_SAFETY_ESCALATION";
      eventId: string;
      reporterId: string;
      description: string;
    }
  | {
      type: "HIGH_SEVERITY_REPORT";
      reportId: string;
      severity: string;
      reporterId: string;
      description: string;
    };

export async function notifyAdmins(notification: AdminNotification) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    console.warn("[Safety] No ADMIN_EMAILS configured — notification dropped");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject = buildAdminSubject(notification);
  const { html, text } = buildAdminBody(notification, appUrl);

  await sendEmail({
    to: adminEmails,
    subject,
    html,
    text,
    from: "Communitē Safety <safety@communite.app>",
  });

  // Optional Slack webhook for instant ops alerting
  const slackWebhook = process.env.SLACK_SAFETY_WEBHOOK;
  if (slackWebhook) {
    await fetch(slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*${subject}*\n${text}`,
        username: "Communitē Safety",
        icon_emoji: ":rotating_light:",
      }),
    }).catch((err) => console.error("[Slack] Failed:", err));
  }
}

function buildAdminSubject(n: AdminNotification): string {
  switch (n.type) {
    case "CRITICAL_SAFETY_ESCALATION":
      return `🚨 CRITICAL SAFETY ESCALATION — Event ${n.eventId}`;
    case "HIGH_SEVERITY_REPORT":
      return `⚠️ ${n.severity} Severity Report — Report ${n.reportId}`;
  }
}

function buildAdminBody(
  n: AdminNotification,
  appUrl: string
): { html: string; text: string } {
  switch (n.type) {
    case "CRITICAL_SAFETY_ESCALATION": {
      const link = `${appUrl}/admin/safety`;
      const text = [
        `Event ID: ${n.eventId}`,
        `Reported by: ${n.reporterId}`,
        `Description: ${n.description}`,
        ``,
        `Event has been AUTO-SUSPENDED. Action required within 10 minutes.`,
        ``,
        `Review: ${link}`,
      ].join("\n");
      const html = `<div style="font-family:sans-serif;max-width:600px">
        <div style="background:#dc2626;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <strong>🚨 CRITICAL SAFETY ESCALATION</strong>
        </div>
        <div style="border:1px solid #fecaca;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p><strong>Event:</strong> ${n.eventId}</p>
          <p><strong>Reporter:</strong> ${n.reporterId}</p>
          <p><strong>Description:</strong> ${n.description}</p>
          <p style="color:#dc2626;font-weight:600">Event AUTO-SUSPENDED. Respond within 10 minutes.</p>
          <a href="${link}" style="display:inline-block;background:#1c1917;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">
            Review in Admin Panel →
          </a>
        </div>
      </div>`;
      return { html, text };
    }
    case "HIGH_SEVERITY_REPORT": {
      const link = `${appUrl}/admin/reports/${n.reportId}`;
      const text = [
        `Report ID: ${n.reportId}`,
        `Severity: ${n.severity}`,
        `Reporter: ${n.reporterId}`,
        `Description: ${n.description}`,
        ``,
        `Review: ${link}`,
      ].join("\n");
      const html = `<div style="font-family:sans-serif;max-width:600px">
        <div style="background:#d97706;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <strong>⚠️ ${n.severity} Report Filed</strong>
        </div>
        <div style="border:1px solid #fde68a;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p><strong>Reporter:</strong> ${n.reporterId}</p>
          <p><strong>Description:</strong> ${n.description}</p>
          <a href="${link}" style="display:inline-block;background:#1c1917;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">
            Review Report →
          </a>
        </div>
      </div>`;
      return { html, text };
    }
  }
}

// ============================================================
// TRANSACTIONAL USER EMAILS
// ============================================================

export async function sendRSVPConfirmedEmail(params: {
  guestEmail: string;
  guestName: string;
  eventTitle: string;
  eventId: string;
  startsAt: Date;
  addressLine1: string;
  city: string;
  state: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${appUrl}/events/${params.eventId}`;
  const dateStr = params.startsAt.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  await sendEmail({
    to: params.guestEmail,
    subject: `✓ You're confirmed for "${params.eventTitle}"`,
    text: [
      `Hi ${params.guestName},`,
      ``,
      `Your RSVP for "${params.eventTitle}" has been confirmed.`,
      ``,
      `When: ${dateStr}`,
      `Where: ${params.addressLine1}, ${params.city}, ${params.state}`,
      ``,
      `View event: ${eventUrl}`,
      ``,
      `No money changes hands — just bring good food and an open mind.`,
      `— The Communitē Team`,
    ].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:600px">
      <div style="background:#1c1917;color:#fff;padding:24px;border-radius:8px 8px 0 0">
        <p style="font-size:22px;margin:0">✓ You're confirmed!</p>
      </div>
      <div style="border:1px solid #e7e5e4;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p>Hi ${params.guestName},</p>
        <p>Your RSVP for <strong>"${params.eventTitle}"</strong> has been confirmed.</p>
        <table style="margin:16px 0;width:100%">
          <tr>
            <td style="padding:8px;background:#f5f5f4;font-size:12px;color:#78716c;width:60px">When</td>
            <td style="padding:8px;font-weight:500">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f5f5f4;font-size:12px;color:#78716c">Where</td>
            <td style="padding:8px;font-weight:500">${params.addressLine1}, ${params.city}, ${params.state}</td>
          </tr>
        </table>
        <a href="${eventUrl}" style="display:inline-block;background:#C2714F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          View Event Details →
        </a>
        <p style="color:#78716c;font-size:13px;margin-top:20px">No money changes hands. Just bring good food and an open mind.</p>
      </div>
    </div>`,
  });
}

export async function sendReviewReminderEmail(params: {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventId: string;
  subjectId: string;
  subjectName: string;
  role: "host" | "guest";
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const reviewUrl = `${appUrl}/events/${params.eventId}/review?subject=${params.subjectId}&name=${encodeURIComponent(params.subjectName)}&role=${params.role}`;

  await sendEmail({
    to: params.recipientEmail,
    subject: `How was your gathering? Leave a reflection for ${params.subjectName}`,
    text: [
      `Hi ${params.recipientName},`,
      ``,
      `"${params.eventTitle}" has ended. Share a reflection about ${params.subjectName}.`,
      ``,
      `Leave your reflection: ${reviewUrl}`,
      `(Link expires in 7 days)`,
    ].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:600px">
      <div style="background:#7A9E7E;color:#fff;padding:24px;border-radius:8px 8px 0 0">
        <p style="font-size:20px;margin:0">How was the gathering?</p>
      </div>
      <div style="border:1px solid #e7e5e4;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p>Hi ${params.recipientName},</p>
        <p><strong>"${params.eventTitle}"</strong> has ended. Share a reflection about <strong>${params.subjectName}</strong>.</p>
        <a href="${reviewUrl}" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">
          Leave a Reflection →
        </a>
        <p style="color:#a8a29e;font-size:12px;margin-top:16px">Link expires in 7 days.</p>
      </div>
    </div>`,
  });
}

export async function sendEventCancelledEmail(params: {
  guestEmail: string;
  guestName: string;
  eventTitle: string;
  hostName: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to: params.guestEmail,
    subject: `Event cancelled: "${params.eventTitle}"`,
    text: [
      `Hi ${params.guestName},`,
      ``,
      `"${params.eventTitle}" hosted by ${params.hostName} has been cancelled.`,
      ``,
      `Browse other gatherings: ${appUrl}/events`,
    ].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:600px">
      <div style="background:#78716c;color:#fff;padding:24px;border-radius:8px 8px 0 0">
        <p style="font-size:20px;margin:0">Event Cancelled</p>
      </div>
      <div style="border:1px solid #e7e5e4;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p>Hi ${params.guestName},</p>
        <p><strong>"${params.eventTitle}"</strong> hosted by ${params.hostName} has been cancelled.</p>
        <a href="${appUrl}/events" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">
          Find Another Gathering →
        </a>
      </div>
    </div>`,
  });
}

export async function sendHostDecisionEmail(params: {
  applicantEmail: string;
  applicantName: string;
  approved: boolean;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (params.approved) {
    await sendEmail({
      to: params.applicantEmail,
      subject: "🏠 Welcome to the host community, " + params.applicantName + "!",
      text: [
        `Hi ${params.applicantName},`,
        ``,
        `Your host application has been approved. You can now create gatherings on Communitē.`,
        ``,
        `Get started: ${appUrl}/events/new`,
        ``,
        `— The Communitē Team`,
      ].join("\n"),
      html: `<div style="font-family:sans-serif;max-width:600px">
        <div style="background:#1c1917;color:#fff;padding:24px;border-radius:8px 8px 0 0">
          <p style="font-size:22px;margin:0">🏠 You're a host!</p>
        </div>
        <div style="border:1px solid #e7e5e4;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p>Hi ${params.applicantName},</p>
          <p>Your host application has been <strong>approved</strong>. You can now create gatherings and invite your community to your table.</p>
          <a href="${appUrl}/events/new" style="display:inline-block;background:#C2714F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0">
            Create Your First Gathering →
          </a>
          <p style="color:#78716c;font-size:13px;margin-top:16px">Review our <a href="${appUrl}/safety" style="color:#C2714F">host safety guidelines</a> before your first event.</p>
        </div>
      </div>`,
    });
  } else {
    await sendEmail({
      to: params.applicantEmail,
      subject: "Your Communitē host application",
      text: [
        `Hi ${params.applicantName},`,
        ``,
        `Thank you for applying to host on Communitē. After review, we're not able to approve your application at this time.`,
        ``,
        `You can continue attending events as a guest and reapply in 30 days.`,
        ``,
        `Questions: team@communite.app`,
      ].join("\n"),
      html: `<div style="font-family:sans-serif;max-width:600px">
        <div style="border:1px solid #e7e5e4;padding:24px;border-radius:8px">
          <p>Hi ${params.applicantName},</p>
          <p>Thank you for applying to host on Communitē. After review, we're unable to approve your application at this time.</p>
          <p style="color:#78716c;font-size:13px">You can continue attending events as a guest and reapply in 30 days. Questions: <a href="mailto:team@communite.app">team@communite.app</a></p>
        </div>
      </div>`,
    });
  }
}

// ============================================================
// PUSH NOTIFICATIONS (Expo)
// ============================================================

type PushMessage = {
  expoPushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
};

export async function sendPushNotification(params: PushMessage) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.expoPushToken,
      sound: "default",
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      badge: params.badge,
    }),
  });

  if (!res.ok) {
    console.error("[Push] Failed:", await res.text());
    return;
  }

  const result = await res.json();
  if (result.data?.status === "error") {
    const details = result.data.details as { error?: string } | undefined;
    if (details?.error === "DeviceNotRegistered") {
      console.warn("[Push] DeviceNotRegistered:", params.expoPushToken);
    }
  }
}

export async function sendPushToMany(notifications: PushMessage[]) {
  const BATCH = 100;
  for (let i = 0; i < notifications.length; i += BATCH) {
    const batch = notifications.slice(i, i + BATCH);
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        batch.map((n) => ({
          to: n.expoPushToken,
          sound: "default",
          title: n.title,
          body: n.body,
          data: n.data ?? {},
        }))
      ),
    }).catch((err) => console.error("[Push batch] Failed:", err));
  }
}
