import { sendEmail, type EmailResponse } from "./resend";

export interface NotificationEmailData {
  recipientEmail: string;
  recipientName?: string;
  title: string;
  message: string;
  priority: 'high' | 'urgent' | 'normal';
  actionUrl?: string;
  context?: string;
  // If true, skip preference check (for mandatory emails like onboarding)
  skipPreferenceCheck?: boolean;
}

// Base URL for the application (used for unsubscribe links)
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.flowhris.com';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Generate the unsubscribe section for emails
 */
function generateUnsubscribeSection(skipPreferenceCheck?: boolean): string {
  if (skipPreferenceCheck) {
    // For mandatory emails (onboarding, offboarding, reactivation)
    return `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            This is an automated notification from Flow HRIS. Please do not reply to this email.
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
            This is a required system notification and cannot be unsubscribed.
          </p>
        </div>
    `;
  }
  
  return `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            This is an automated notification from Flow HRIS. Please do not reply to this email.
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
            Don't want to receive these emails? 
            <a href="${APP_BASE_URL}/profile/settings?tab=notifications" style="color: #6b7280; text-decoration: underline;">
              Manage your email preferences
            </a>
          </p>
        </div>
  `;
}

/**
 * Generate plain text unsubscribe section
 */
function generateUnsubscribeText(skipPreferenceCheck?: boolean): string {
  if (skipPreferenceCheck) {
    return `---\nThis is an automated notification from Flow HRIS. Please do not reply to this email.\nThis is a required system notification and cannot be unsubscribed.`;
  }
  
  return `---\nThis is an automated notification from Flow HRIS. Please do not reply to this email.\n\nDon't want to receive these emails? Manage your preferences: ${APP_BASE_URL}/profile/settings?tab=notifications`;
}

/**
 * Generate HTML content for a notification email
 */
function generateNotificationEmailHtml(data: NotificationEmailData): string {
  const priorityColors: Record<string, string> = {
    urgent: '#dc2626',
    high: '#ea580c',
    normal: '#2563eb',
  };
  const priorityLabels: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High Priority',
    normal: 'Notification',
  };
  
  const priorityColor = priorityColors[data.priority] || priorityColors.normal;
  const priorityLabel = priorityLabels[data.priority] || priorityLabels.normal;
  
  // Escape user-provided content
  const safeTitle = escapeHtml(data.title);
  const safeMessage = escapeHtml(data.message);
  const safeRecipientName = data.recipientName ? escapeHtml(data.recipientName) : undefined;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <!-- Priority Badge -->
        <div style="margin-bottom: 16px;">
          <span style="background-color: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
            ${priorityLabel}
          </span>
        </div>
        
        <!-- Greeting -->
        ${safeRecipientName ? `<p style="margin: 0 0 16px 0; color: #374151; font-size: 14px;">Hi ${safeRecipientName},</p>` : ''}
        
        <!-- Title -->
        <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
          ${safeTitle}
        </h1>
        
        <!-- Message -->
        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
          ${safeMessage}
        </p>
        
        <!-- Action Button -->
        ${data.actionUrl ? `
        <div style="margin-bottom: 24px;">
          <a href="${data.actionUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            View Details
          </a>
        </div>
        ` : ''}
        
        <!-- Footer with Unsubscribe -->
        ${generateUnsubscribeSection(data.skipPreferenceCheck)}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text content for a notification email
 */
function generateNotificationEmailText(data: NotificationEmailData): string {
  const priorityLabels: Record<string, string> = {
    urgent: '[URGENT]',
    high: '[HIGH PRIORITY]',
    normal: '',
  };
  
  const priorityLabel = priorityLabels[data.priority] || '';
  
  let text = priorityLabel ? `${priorityLabel}\n\n` : '';
  
  if (data.recipientName) {
    text += `Hi ${data.recipientName},\n\n`;
  }
  
  text += `${data.title}\n\n`;
  text += `${data.message}\n\n`;
  
  if (data.actionUrl) {
    text += `View Details: ${data.actionUrl}\n\n`;
  }
  
  text += generateUnsubscribeText(data.skipPreferenceCheck);
  
  return text;
}

/**
 * Send a notification email for high priority notifications
 * @param data - Notification email data
 * @returns EmailResponse with success status
 */
export async function sendNotificationEmail(
  data: NotificationEmailData
): Promise<EmailResponse> {
  let subject: string;
  
  switch (data.priority) {
    case 'urgent':
      subject = `🚨 Urgent: ${data.title}`;
      break;
    case 'high':
      subject = `⚠️ ${data.title}`;
      break;
    default:
      subject = data.title;
  }
    
  return sendEmail({
    to: data.recipientEmail,
    subject,
    html: generateNotificationEmailHtml(data),
    text: generateNotificationEmailText(data),
  });
}
