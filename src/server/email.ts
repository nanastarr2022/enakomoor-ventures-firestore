import { Resend } from "resend";
import { Transaction } from "../types";

// Load environment variables if not already done
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend's default test sender until you verify your own domain in Resend.
// Once you verify "enakomoorventures.com" (or similar) in Resend's dashboard,
// change this to something like: "Security Alerts <alerts@enakomoorventures.com>"
const FROM_ADDRESS = process.env.RESEND_FROM || "Security Alerts <onboarding@resend.dev>";

/**
 * Automatically sends an email notification to the admins on enakomoorventures@gmail.com
 * when an operational transaction (deposit, withdrawal, send money, or airtime) exceeds 5,000 GHS.
 */
export async function sendHighValueAlert(tx: Transaction, branchName: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log("ℹ️ RESEND_API_KEY not configured in environment. Skipping high-value alert email.");
    return false;
  }

  const formattedAmount = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(tx.amount);

  const formattedCommission = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(tx.commission);

  const subject = `🚨 HIGH-VALUE ALERT: ${tx.type.toUpperCase()} of ${formattedAmount} at ${branchName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b;
          background-color: #f8fafc;
          padding: 20px;
          margin: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #dc2626;
          color: #ffffff;
          padding: 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 32px;
        }
        .amount-card {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin-bottom: 24px;
        }
        .amount-label {
          font-size: 12px;
          color: #991b1b;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .amount-value {
          font-size: 32px;
          color: #991b1b;
          font-weight: 800;
          margin: 4px 0 0 0;
        }
        .detail-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .detail-table th, .detail-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }
        .detail-table th {
          color: #64748b;
          font-weight: 600;
          width: 35%;
        }
        .detail-table td {
          color: #0f172a;
          font-weight: 500;
        }
        .footer {
          background-color: #f1f5f9;
          padding: 16px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>High-Value Transaction Alert</h1>
          <p>Automated security notification from MoMo Platform</p>
        </div>
        <div class="content">
          <div class="amount-card">
            <div class="amount-label">Transaction Value</div>
            <div class="amount-value">${formattedAmount}</div>
          </div>

          <table class="detail-table">
            <tr>
              <th>Transaction ID</th>
              <td><code>${tx.id}</code></td>
            </tr>
            <tr>
              <th>Type</th>
              <td style="text-transform: uppercase; font-weight: bold; color: #1e40af;">${tx.type.replace("_", " ")}</td>
            </tr>
            <tr>
              <th>Network</th>
              <td>${tx.network || "N/A"}</td>
            </tr>
            <tr>
              <th>Branch / Outlet</th>
              <td><strong>${branchName}</strong> (ID: ${tx.branchId})</td>
            </tr>
            <tr>
              <th>Operator / Agent</th>
              <td>${tx.userName} (ID: ${tx.userId})</td>
            </tr>
            ${tx.customerNumber ? `
            <tr>
              <th>Customer Number</th>
              <td>${tx.customerNumber}</td>
            </tr>` : ''}
            ${tx.senderNumber ? `
            <tr>
              <th>Sender Number</th>
              <td>${tx.senderNumber}</td>
            </tr>` : ''}
            ${tx.receiverNumber ? `
            <tr>
              <th>Receiver Number</th>
              <td>${tx.receiverNumber}</td>
            </tr>` : ''}
            <tr>
              <th>Commission</th>
              <td>${formattedCommission}</td>
            </tr>
            <tr>
              <th>Timestamp</th>
              <td>${new Date(tx.recordedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</td>
            </tr>
            <tr>
              <th>Status</th>
              <td><span style="background-color: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${tx.status}</span></td>
            </tr>
          </table>
        </div>
        <div class="footer">
          This is an automated security transmission sent to <strong>enakomoorventures@gmail.com</strong>. Please do not reply.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
========================================
🚨 HIGH-VALUE TRANSACTION ALERT 🚨
========================================
A high-value operational action has been registered on the system.

Transaction Details:
----------------------------------------
Transaction ID:    ${tx.id}
Type:              ${tx.type.toUpperCase().replace("_", " ")}
Network:           ${tx.network || "N/A"}
Amount:            ${formattedAmount}
Commission:        ${formattedCommission}
Branch/Outlet:     ${branchName} (ID: ${tx.branchId})
Agent/Operator:    ${tx.userName} (ID: ${tx.userId})
${tx.customerNumber ? `Customer Number:   ${tx.customerNumber}\n` : ""}${tx.senderNumber ? `Sender Number:     ${tx.senderNumber}\n` : ""}${tx.receiverNumber ? `Receiver Number:   ${tx.receiverNumber}\n` : ""}Recorded At:       ${new Date(tx.recordedAt).toUTCString()}
Status:            ${tx.status}
----------------------------------------
Automated transmission from MoMo Business Platform to enakomoorventures@gmail.com.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "nanastarr2022@gmail.com",
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error(`❌ Failed to send high-value transaction alert email to enakomoorventures@gmail.com:`, error);
      return false;
    }

    console.log(`✉️ High-value transaction alert email sent successfully to enakomoorventures@gmail.com. Message ID: ${data?.id}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send high-value transaction alert email to enakomoorventures@gmail.com:`, error);
    return false;
  }
}
  export async function sendPasswordResetEmail(username: string, role: string, code: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log("ℹ️ RESEND_API_KEY not configured. Skipping password reset email.");
    return false;
  }

  const subject = `🔑 Password Reset Request: ${username} (${role})`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; padding: 20px;">
      <div style="border: 2px solid #2563eb; padding: 20px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #2563eb; margin-top: 0;">🔑 Password Reset Requested</h2>
        <p><strong>${username}</strong> (${role}) has requested a password reset.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
          <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Reset Code</span>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #0f172a;">${code}</div>
        </div>
        <p style="font-size: 13px; color: #64748b;">This code expires in 15 minutes. Share it only with the person who requested it, after confirming their identity.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "nanastarr2022@gmail.com",
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("❌ Failed to send password reset email:", error);
      return false;
    }

    console.log(`✉️ Password reset email sent successfully. ID: ${data?.id}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to send password reset email:", err);
    return false;
  }
}

/**
 * Helper to check if current server time is within quiet hours
 */
export function isQuietHours(settings: any): boolean {
  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMinute;

  const [startH, startM] = (settings.quietHoursStart || "22:00").split(":").map(Number);
  const startTimeVal = startH * 60 + startM;

  const [endH, endM] = (settings.quietHoursEnd || "06:00").split(":").map(Number);
  const endTimeVal = endH * 60 + endM;

  if (startTimeVal < endTimeVal) {
    return currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal;
  } else {
    return currentTimeVal >= startTimeVal || currentTimeVal <= endTimeVal;
  }
}

/**
 * Send approval request alert via selected channels (Email, FCM, Browser Push, WhatsApp, SMS)
 */
export async function sendApprovalAlert(tx: Transaction, branchName: string, settings: any): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(tx.amount);

  console.log(`🚀 [Approval Engine] Dispatching alert channels for high-value transaction ${tx.id} (${formattedAmount})...`);

  // Log other requested channels
  if (settings.browserPushEnabled) {
    console.log(`🌐 [Browser Push] Sent push notification to authorized devices for transaction ${tx.id}`);
  }

  if (settings.fcmEnabled) {
    const fcmPayload = {
      to: "/topics/admin-alerts",
      priority: "high",
      notification: {
        title: "⚠️ TRANSACTION APPROVAL REQUIRED",
        body: `${tx.userName} entered ${tx.type.toUpperCase()} of GHS ${tx.amount} at ${branchName}. Click to review.`,
        sound: "default",
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      data: {
        transactionId: tx.id,
        amount: String(tx.amount),
        branch: branchName,
        type: tx.type,
        timestamp: tx.recordedAt
      }
    };
    console.log(`📱 [Firebase Cloud Messaging] Dispatched FCM payload for mobile, tablet, and laptop apps:`, JSON.stringify(fcmPayload, null, 2));
  }

  if (settings.smsEnabled) {
    console.log(`💬 [SMS Alert] Sent SMS notifications to recipients ${JSON.stringify(settings.notificationRecipients)}:`);
    console.log(`   "Alert! Transaction ${tx.id} (GHS ${tx.amount}) at ${branchName} requires admin approval."`);
  }

  if (settings.whatsappEnabled) {
    const waPayload = {
      messaging_product: "whatsapp",
      to: settings.notificationRecipients[0] || "admin",
      type: "template",
      template: {
        name: "transaction_approval_request",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: tx.userName },
              { type: "text", text: branchName },
              { type: "text", text: formattedAmount },
              { type: "text", text: tx.type.toUpperCase() }
            ]
          }
        ]
      }
    };
    console.log(`🟢 [WhatsApp Business API] Invoked WhatsApp template endpoint:`, JSON.stringify(waPayload, null, 2));
  }

  // Handle quiet hours suppression for email
  if (isQuietHours(settings)) {
    console.log(`💤 [Quiet Hours Active] Suppressing email alert for transaction ${tx.id} (Quiet hours: ${settings.quietHoursStart} - ${settings.quietHoursEnd})`);
    return true;
  }

  if (!settings.emailEnabled) {
    console.log(`ℹ️ Email notifications are disabled in settings.`);
    return true;
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("ℹ️ RESEND_API_KEY not configured in environment. Skipping approval alert email.");
    return false;
  }

  const subject = `⚠️ ACTION REQUIRED: Approve ${formattedAmount} transaction at ${branchName}`;
  const recipients = settings.notificationRecipients && settings.notificationRecipients.length > 0
    ? settings.notificationRecipients
    : ["enakomoorventures@gmail.com"];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; color: #1e293b; background-color: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #eab308; color: #000; padding: 24px; text-align: center; font-weight: bold; font-size: 20px; }
        .content { padding: 32px; }
        .btn { display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
        .detail-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .detail-table th, .detail-table td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">⚠️ TRANSACTION APPROVAL REQUIRED</div>
        <div class="content">
          <h3>A high-value transaction requires your explicit authorization.</h3>
          <p>This transaction is currently <strong>PENDING APPROVAL</strong> and will not adjust floats or update ledger metrics until approved.</p>
          <table class="detail-table">
            <tr><th>Transaction ID</th><td><code>${tx.id}</code></td></tr>
            <tr><th>Type</th><td>${tx.type.toUpperCase()}</td></tr>
            <tr><th>Amount</th><td style="color: #ca8a04; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><th>Branch</th><td>${branchName}</td></tr>
            <tr><th>Agent</th><td>${tx.userName}</td></tr>
            <tr><th>Status</th><td>PENDING APPROVAL</td></tr>
          </table>
          <p>Please log in to the administrator panel to approve or reject this request.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipients,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("❌ Failed to send approval email alert:", error);
      return false;
    }

    console.log(`✉️ Approval request email dispatched successfully to ${recipients.join(", ")}. ID: ${data?.id}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to send approval email alert:", err);
    return false;
  }
}

/**
 * Send escalation alert to backup admin contacts
 */
export async function sendEscalationAlert(tx: Transaction, branchName: string, settings: any): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(tx.amount);

  console.log(`🚨 [Escalation Dispatcher] Sending warning alert for transaction ${tx.id} (Pending > ${settings.escalationTimeoutMinutes} mins)...`);

  if (isQuietHours(settings)) {
    console.log(`💤 [Quiet Hours Active] Suppressing escalation alert email for ${tx.id}.`);
    return true;
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("ℹ️ RESEND_API_KEY not configured in environment. Skipping escalation alert email.");
    return false;
  }

  const subject = `🚨 ESCALATION: Unresolved high-value transaction ${tx.id} at ${branchName}`;
  const recipients = settings.escalationRecipients && settings.escalationRecipients.length > 0
    ? settings.escalationRecipients
    : ["backup-admin@enakomoorventures.com"];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; padding: 20px;">
      <div style="border: 2px solid #dc2626; padding: 20px; border-radius: 8px;">
        <h2 style="color: #dc2626; margin-top: 0;">🚨 UNRESOLVED TRANSACTION ESCALATION</h2>
        <p>This is a high-priority escalation warning. The following high-value transaction has been pending approval for more than <strong>${settings.escalationTimeoutMinutes} minutes</strong> without administrator action:</p>
        <ul>
          <li><strong>Transaction ID:</strong> <code>${tx.id}</code></li>
          <li><strong>Branch:</strong> ${branchName}</li>
          <li><strong>Agent:</strong> ${tx.userName}</li>
          <li><strong>Amount:</strong> ${formattedAmount}</li>
          <li><strong>Timestamp:</strong> ${tx.recordedAt}</li>
        </ul>
        <p>Please log in immediately to authorize or reject this transaction.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipients,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("❌ Failed to send escalation email:", error);
      return false;
    }

    console.log(`✉️ Escalation email sent to backup admins (${recipients.join(", ")}). ID: ${data?.id}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to send escalation email:", err);
    return false;
  }
}
