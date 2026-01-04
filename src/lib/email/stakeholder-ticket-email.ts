import { sendEmail, type EmailResponse } from "./resend";

export interface PublicTicketNotificationData {
  recipientEmail: string;
  recipientName?: string;
  stakeholderName: string;
  ticketTitle: string;
  ticketDescription: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  ticketUrl?: string;
}

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
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * Get priority color and label
 */
function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'Urgent':
      return { color: '#dc2626', label: '🚨 Urgent', bgColor: '#fef2f2' };
    case 'High':
      return { color: '#ea580c', label: '⚠️ High Priority', bgColor: '#fff7ed' };
    case 'Medium':
      return { color: '#2563eb', label: 'Normal Priority', bgColor: '#eff6ff' };
    case 'Low':
    default:
      return { color: '#16a34a', label: 'Low Priority', bgColor: '#f0fdf4' };
  }
}

/**
 * Generate HTML content for public ticket notification email
 */
function generatePublicTicketEmailHtml(data: PublicTicketNotificationData): string {
  const priorityStyle = getPriorityStyle(data.priority);
  
  // Escape user-provided content
  const safeStakeholderName = escapeHtml(data.stakeholderName);
  const safeTicketTitle = escapeHtml(data.ticketTitle);
  const safeTicketDescription = escapeHtml(data.ticketDescription);
  const safeRecipientName = data.recipientName ? escapeHtml(data.recipientName) : undefined;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Public Ticket: ${safeStakeholderName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <!-- Header with Logo/Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #2563eb; color: white; padding: 12px; border-radius: 12px; margin-bottom: 16px;">
            <span style="font-size: 24px;">🎫</span>
          </div>
          <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">
            New Ticket from Public Page
          </h2>
        </div>
        
        <!-- Priority Badge -->
        <div style="margin-bottom: 20px; text-align: center;">
          <span style="background-color: ${priorityStyle.bgColor}; color: ${priorityStyle.color}; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid ${priorityStyle.color};">
            ${priorityStyle.label}
          </span>
        </div>
        
        <!-- Greeting -->
        ${safeRecipientName ? `<p style="margin: 0 0 20px 0; color: #374151; font-size: 14px;">Hi ${safeRecipientName},</p>` : ''}
        
        <!-- Main Message -->
        <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
            ${safeStakeholderName}
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            has created a new ticket from the public page
          </p>
        </div>
        
        <!-- Ticket Details -->
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
            ${safeTicketTitle}
          </h3>
          
          <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
            ${safeTicketDescription}
          </p>
        </div>
        
        <!-- Action Button -->
        ${data.ticketUrl ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${data.ticketUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            View Ticket Details
          </a>
        </div>
        ` : ''}
        
        <!-- Info Box -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
          <p style="margin: 0; color: #1e40af; font-size: 12px; line-height: 1.5;">
            <strong>Note:</strong> This ticket was submitted by the stakeholder through the public ticket portal and may require immediate attention.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
            Best regards,<br>
            Flow HRIS Team
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 11px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text content for public ticket notification email
 */
function generatePublicTicketEmailText(data: PublicTicketNotificationData): string {
  const priorityStyle = getPriorityStyle(data.priority);
  
  let text = `${priorityStyle.label}\n\n`;
  
  if (data.recipientName) {
    text += `Hi ${data.recipientName},\n\n`;
  }
  
  text += `${data.stakeholderName} has created a new ticket from the public page.\n\n`;
  text += `Ticket: ${data.ticketTitle}\n\n`;
  text += `Description:\n${data.ticketDescription}\n\n`;
  
  if (data.ticketUrl) {
    text += `View Ticket: ${data.ticketUrl}\n\n`;
  }
  
  text += `NOTE: This ticket was submitted by the stakeholder through the public ticket portal and may require immediate attention.\n\n`;
  text += `---\n`;
  text += `Best regards,\n`;
  text += `Flow HRIS Team\n\n`;
  text += `This is an automated notification. Please do not reply to this email.`;
  
  return text;
}

/**
 * Send notification email for a public ticket creation
 * @param data - Public ticket notification data
 * @returns EmailResponse with success status
 */
export async function sendPublicTicketNotificationEmail(
  data: PublicTicketNotificationData
): Promise<EmailResponse> {
  const priorityStyle = getPriorityStyle(data.priority);
  const subject = data.priority === 'Urgent' || data.priority === 'High'
    ? `${priorityStyle.label.split(' ')[0]} New Ticket from ${data.stakeholderName}`
    : `New Ticket from ${data.stakeholderName}`;
    
  return sendEmail({
    to: data.recipientEmail,
    subject,
    html: generatePublicTicketEmailHtml(data),
    text: generatePublicTicketEmailText(data),
  });
}
