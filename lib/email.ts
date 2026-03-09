import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendInviteEmail(
  toEmail: string,
  toName: string,
  invitedByName: string,
  dashboardUrl: string = "http://localhost:3000"
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

    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: `Hi ${toName},\n\n${invitedByName} has invited you to access the Pod 3 Dashboard!\n\nSign in here: ${dashboardUrl}/dashboard`,
    });

    console.log(`Email sent to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
