import nodemailer from "nodemailer";

export interface SendInviteEmailParams {
  to: string;
  recipientName: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}

export interface EmailSendResult {
  success: boolean;
  delivered: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  const cleanPass = pass.replace(/\s+/g, "");

  if (host.includes("gmail")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: cleanPass }
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: cleanPass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production"
    }
  });
}

function generateInviteEmailHtml(params: SendInviteEmailParams): string {
  const { recipientName, inviterName, workspaceName, role, inviteUrl } = params;
  const formattedRole = role.replace(/_/g, " ").toUpperCase();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${workspaceName} on MarketerOS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #09090b;
      color: #fafafa;
    }
    .wrapper {
      max-width: 580px;
      margin: 40px auto;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
    }
    .logo-badge {
      display: inline-block;
      width: 32px;
      height: 32px;
      background: #ffffff;
      color: #09090b;
      font-weight: 900;
      border-radius: 8px;
      text-align: center;
      line-height: 32px;
      font-size: 16px;
      margin-right: 12px;
      vertical-align: middle;
    }
    .brand-name {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      vertical-align: middle;
      letter-spacing: -0.5px;
    }
    .body {
      padding: 32px;
    }
    h1 {
      margin-top: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #a1a1aa;
      margin: 16px 0;
    }
    .card {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 18px 20px;
      margin: 24px 0;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .card-row:last-child {
      margin-bottom: 0;
    }
    .card-label {
      color: #71717a;
    }
    .card-value {
      color: #fafafa;
      font-weight: 600;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .btn {
      display: inline-block;
      background-color: #ffffff;
      color: #09090b !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      letter-spacing: -0.2px;
      transition: background-color 0.15s ease;
    }
    .btn:hover {
      background-color: #f4f4f5;
    }
    .fallback-url {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 12px;
      word-break: break-all;
      font-size: 11px;
      color: #a1a1aa;
      font-family: monospace;
      margin-top: 8px;
    }
    .footer {
      padding: 24px 32px;
      background: #141416;
      border-top: 1px solid #27272a;
      text-align: center;
      font-size: 12px;
      color: #71717a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="logo-badge">M</span>
      <span class="brand-name">MarketerOS</span>
    </div>
    <div class="body">
      <h1>Join ${workspaceName} on MarketerOS</h1>
      <p>Hello <strong>${recipientName || "there"}</strong>,</p>
      <p>
        <strong>${inviterName}</strong> has invited you to collaborate as a team member on <strong>${workspaceName}</strong>.
      </p>

      <div class="card">
        <div class="card-row">
          <span class="card-label">Workspace:</span>
          <span class="card-value">${workspaceName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Assigned Role:</span>
          <span class="card-value">${formattedRole}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Email:</span>
          <span class="card-value">${params.to}</span>
        </div>
      </div>

      <p>
        To accept the invitation, visit the secure link below to create your password and activate your account:
      </p>

      <div class="btn-container">
        <a href="${inviteUrl}" class="btn" target="_blank">Accept Invite & Set Password</a>
      </div>

      <p style="font-size: 12px; color: #71717a; margin-top: 24px;">
        If the button above does not work, copy and paste the following URL into your browser:
      </p>
      <div class="fallback-url">${inviteUrl}</div>
      <p style="font-size: 11px; color: #71717a; margin-top: 12px;">
        This invitation link will expire in 7 days. If you were not expecting this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MarketerOS. The operating system for modern marketing teams.<br>
      All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a team invitation email via SMTP (Nodemailer), Resend API, or falls back to console logging in development.
 */
export async function sendTeamInviteEmail(params: SendInviteEmailParams): Promise<EmailSendResult> {
  const fromAddress = process.env.SMTP_FROM || process.env.RESEND_FROM || "MarketerOS <no-reply@marketeros.com>";
  const subject = `You've been invited to join ${params.workspaceName} on MarketerOS`;
  const html = generateInviteEmailHtml(params);

  // 1. Try Resend API if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.to],
          subject,
          html
        })
      });

      const data = await response.json();
      if (response.ok && data?.id) {
        return { success: true, delivered: true, messageId: data.id };
      }
      console.warn("Resend API warning:", data);
    } catch (err) {
      console.error("Resend API error:", err);
    }
  }

  // 2. Try SMTP Transporter (Nodemailer)
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: params.to,
        subject,
        html
      });
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (err: any) {
      console.error("SMTP sending failed:", err?.message || err);
      return {
        success: false,
        delivered: false,
        error: err?.message || "SMTP sending failed.",
        previewUrl: params.inviteUrl
      };
    }
  }

  // 3. Fallback: Log to console in development / when unconfigured
  console.log("=================================================");
  console.log("📧 TEAM INVITATION EMAIL (DEV / FALLBACK PREVIEW)");
  console.log(`To: ${params.to}`);
  console.log(`Workspace: ${params.workspaceName}`);
  console.log(`Role: ${params.role}`);
  console.log(`Invite URL: ${params.inviteUrl}`);
  console.log("=================================================");

  return {
    success: true,
    delivered: false,
    previewUrl: params.inviteUrl
  };
}

export interface SendRoleUpdateEmailParams {
  to: string;
  recipientName: string;
  updatedByName: string;
  workspaceName: string;
  newRole: string;
  loginUrl: string;
}

function generateRoleUpdateEmailHtml(params: SendRoleUpdateEmailParams): string {
  const { recipientName, updatedByName, workspaceName, newRole, loginUrl } = params;
  const formattedRole = newRole.replace(/_/g, " ").toUpperCase();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your workspace role has been updated on MarketerOS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #09090b; color: #fafafa; }
    .wrapper { max-width: 580px; margin: 40px auto; background: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; }
    .header { padding: 32px 32px 24px 32px; border-bottom: 1px solid #27272a; }
    .logo-badge { display: inline-block; width: 32px; height: 32px; background: #ffffff; color: #09090b; font-weight: 900; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px; margin-right: 12px; vertical-align: middle; }
    .brand-name { display: inline-block; font-size: 16px; font-weight: 700; color: #ffffff; vertical-align: middle; }
    .body { padding: 32px; }
    h1 { margin-top: 0; font-size: 22px; font-weight: 700; color: #ffffff; }
    p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
    .card { background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 18px 20px; margin: 24px 0; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .card-label { color: #71717a; }
    .card-value { color: #fafafa; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0 24px 0; }
    .btn { display: inline-block; background-color: #ffffff; color: #09090b !important; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
    .footer { padding: 24px 32px; background: #141416; border-top: 1px solid #27272a; text-align: center; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="logo-badge">M</span>
      <span class="brand-name">MarketerOS</span>
    </div>
    <div class="body">
      <h1>Your Workspace Role Has Been Updated</h1>
      <p>Hello <strong>${recipientName || "there"}</strong>,</p>
      <p>
        <strong>${updatedByName}</strong> has updated your access role on the workspace <strong>${workspaceName}</strong>.
      </p>

      <div class="card">
        <div class="card-row">
          <span class="card-label">Workspace:</span>
          <span class="card-value">${workspaceName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">New Assigned Role:</span>
          <span class="card-value">${formattedRole}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Updated By:</span>
          <span class="card-value">${updatedByName}</span>
        </div>
      </div>

      <p>Your workspace permissions have been updated automatically. You can sign in to your dashboard to access your features.</p>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank">Sign In To Workspace</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MarketerOS. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendRoleUpdateEmail(params: SendRoleUpdateEmailParams): Promise<EmailSendResult> {
  const fromAddress = process.env.SMTP_FROM || process.env.RESEND_FROM || "MarketerOS <no-reply@marketeros.com>";
  const subject = `Your workspace role has been updated to ${params.newRole.replace(/_/g, " ").toUpperCase()} on MarketerOS`;
  const html = generateRoleUpdateEmailHtml(params);

  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: fromAddress, to: [params.to], subject, html })
      });
      const data = await response.json();
      if (response.ok && data?.id) return { success: true, delivered: true, messageId: data.id };
    } catch (err) {
      console.error("Resend API error:", err);
    }
  }

  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({ from: fromAddress, to: params.to, subject, html });
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (err: any) {
      console.error("SMTP sending failed:", err?.message || err);
      return { success: false, delivered: false, error: err?.message || "SMTP sending failed." };
    }
  }

  console.log("=================================================");
  console.log("📧 ROLE UPDATE EMAIL (DEV / FALLBACK PREVIEW)");
  console.log(`To: ${params.to}`);
  console.log(`Workspace: ${params.workspaceName}`);
  console.log(`New Role: ${params.newRole}`);
  console.log("=================================================");

  return { success: true, delivered: false };
}

