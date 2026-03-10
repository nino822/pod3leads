import nodemailer from "nodemailer";

function getMailerConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    return {
      ok: false as const,
      error:
        "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in your environment.",
    };
  }

  return {
    ok: true as const,
    user,
    pass,
  };
}

function getDashboardBaseUrl() {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) return nextAuthUrl;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

function getFromHeader(defaultEmail: string) {
  const senderName = process.env.EMAIL_FROM_NAME?.trim() || "Pod 3 Dashboard";
  const senderEmail = process.env.EMAIL_FROM_EMAIL?.trim() || defaultEmail;
  return `${senderName} <${senderEmail}>`;
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const config = getMailerConfig();
  if (!config.ok) {
    return { success: false as const, error: config.error };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: getFromHeader(config.user),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true as const, messageId: info.messageId };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendInviteEmail(
  toEmail: string,
  toName: string,
  invitedByName: string,
  dashboardUrl: string = getDashboardBaseUrl()
) {
  try {
    const subject = `You're invited to Pod 3 Dashboard!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pod 3 Dashboard Invitation</h1>
            </div>
            <div class="content">
              <p>Hi ${toName},</p>
              <p>${invitedByName} has invited you to access the <strong>Pod 3 Dashboard</strong>!</p>
              <p>Click the button below to sign in with your Google account:</p>
              <a href="${dashboardUrl}/dashboard" class="button">Access Dashboard</a>
              <p style="color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                If you have any questions, please contact ${invitedByName}.
              </p>
            </div>
            <div class="footer">
              <p>Pod 3 Dashboard • Leads Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: toEmail,
      subject,
      html: htmlContent,
      text: `Hi ${toName},\n\n${invitedByName} has invited you to access the Pod 3 Dashboard!\n\nSign in here: ${dashboardUrl}/dashboard`,
    });

    if (!result.success) {
      console.error(`Failed to send email to ${toEmail}:`, result.error);
      return result;
    }

    console.log(`Email sent to ${toEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendLoginCodeEmail(toEmail: string, code: string) {
  try {
    const subject = "Your Pod 3 Dashboard login code";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0f766e 0%, #0e7490 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .code { font-size: 32px; letter-spacing: 6px; font-weight: bold; color: #0f766e; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pod 3 Dashboard</h1>
            </div>
            <div class="content">
              <p>Use this one-time code to sign in:</p>
              <div class="code">${code}</div>
              <p>This code expires in 10 minutes.</p>
              <p>If you did not request this code, you can ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await sendEmail({
      to: toEmail,
      subject,
      html: htmlContent,
      text: `Your Pod 3 Dashboard login code is ${code}. This code expires in 10 minutes.`,
    });
  } catch (error) {
    console.error(`Failed to send login code email to ${toEmail}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendPasswordResetEmail(toEmail: string, code: string) {
  try {
    const subject = "Reset your Pod 3 Dashboard password";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .code { font-size: 32px; letter-spacing: 6px; font-weight: bold; color: #dc2626; margin: 20px 0; }
            .warning { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>We received a request to reset your password. Use this one-time code:</p>
              <div class="code">${code}</div>
              <p>This code expires in 10 minutes.</p>
              <p><span class="warning">⚠️ Important:</span> If you did not request a password reset, please ignore this email or contact support.</p>
              <p>Your account security is important to us. Never share this code with anyone.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await sendEmail({
      to: toEmail,
      subject,
      html: htmlContent,
      text: `Your password reset code for Pod 3 Dashboard is ${code}. This code expires in 10 minutes. If you did not request this, please ignore this email.`,
    });
  } catch (error) {
    console.error(`Failed to send password reset email to ${toEmail}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
