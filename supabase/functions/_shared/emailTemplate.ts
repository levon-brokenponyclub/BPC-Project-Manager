/**
 * Email template builder for notification emails
 * Provides a simple, clean HTML template for notification delivery
 */

export interface EmailTemplateParams {
  title: string;
  description?: string;
  actor: string;
  actorAvatarUrl?: string | null;
  entity: string;
  ctaUrl?: string | null;
  ctaText?: string;
}

export function buildNotificationEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    title,
    description,
    actor,
    actorAvatarUrl,
    entity,
    ctaUrl,
    ctaText = "Open in Broken Pony Club",
  } = params;

  // Subject: use the title directly (already formatted with actor-first language)
  const subject = title;

  // Plain text version
  const text = `
${title}

${description ? `${description}\n` : ""}
${ctaUrl ? `\nView in app: ${ctaUrl}` : ""}

---
Broken Pony Club Project Manager
  `.trim();

  // HTML version
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f7;
      color: #1d1d1f;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .email-body {
      padding: 32px 24px;
    }
    .actor-info {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e5e7;
    }
    .actor-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      margin-right: 12px;
      background-color: #e5e5e7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #6b7485;
      font-size: 18px;
    }
    .actor-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    .actor-details {
      flex: 1;
    }
    .actor-name {
      font-weight: 600;
      font-size: 16px;
      color: #1d1d1f;
      margin: 0 0 4px 0;
    }
    .actor-action {
      font-size: 14px;
      color: #6b7485;
      margin: 0;
    }
    .notification-content {
      margin-bottom: 24px;
    }
    .notification-title {
      font-size: 18px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    .notification-description {
      font-size: 14px;
      color: #6b7485;
      margin: 0;
      line-height: 1.6;
      padding: 12px 16px;
      background-color: #f5f5f7;
      border-radius: 8px;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
      margin-top: 8px;
    }
    .cta-button:hover {
      background-color: #5568d3;
    }
    .email-footer {
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #86868b;
      border-top: 1px solid #e5e5e7;
    }
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Broken Pony Club Project Manager</h1>
    </div>
    <div class="email-body">
      <div class="actor-info">
        <div class="actor-avatar">
          ${actorAvatarUrl ? `<img src="${escapeHtml(actorAvatarUrl)}" alt="${escapeHtml(actor)}" />` : getInitials(actor)}
        </div>
        <div class="actor-details">
          <p class="actor-name">${escapeHtml(actor)}</p>
          <p class="actor-action">New activity</p>
        </div>
      </div>
      <div class="notification-content">
        <h2 class="notification-title">${escapeHtml(title)}</h2>
        ${description ? `<p class="notification-description">${escapeHtml(description)}</p>` : ""}
      </div>
      ${ctaUrl ? `<a href="${escapeHtml(ctaUrl)}" class="cta-button">${escapeHtml(ctaText)}</a>` : ""}
    </div>
    <div class="email-footer">
      <p>You received this email because you're a member of this workspace.</p>
      <p>Manage your <a href="${ctaUrl ? new URL("/settings", ctaUrl).href : "#"}">notification preferences</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
