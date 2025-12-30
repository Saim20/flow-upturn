"use client";

import { createSystemNotification } from "@/hooks/useNotifications";
import { getCompanyId } from "@/lib/utils/auth";
import { captureError } from "@/lib/sentry";

export interface NotificationOptions {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const showNotification = ({ message, type, duration = 3000 }: NotificationOptions) => {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up ${
    type === 'success' ? 'bg-success/10 text-success border border-success/30' :
    type === 'error' ? 'bg-error/10 text-error border border-error/30' :
    type === 'warning' ? 'bg-warning/10 text-warning border border-warning/30' :
    'bg-info/10 text-info border border-info/30'
  }`;
  notification.innerHTML = message;
  document.body.appendChild(notification);
  
  // Auto remove after duration
  setTimeout(() => {
    notification.classList.add('animate-fade-out');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, duration);
};

// Utility functions for creating common notification types

export const NotificationTemplates = {
  // Task notifications
  task: {
    completed: (taskTitle: string, completedByName: string) => ({
      title: "Task Completed",
      message: `"${taskTitle}" has been marked as complete by ${completedByName}.`,
      context: "task_update",
      priority: "normal" as const,
    }),
    deadlineApproaching: (taskTitle: string, timeLeft: string, isSameDay: boolean) => ({
      title: isSameDay ? "Task Due Soon" : "Task Deadline Tomorrow",
      message: isSameDay 
        ? `"${taskTitle}" is due in ${timeLeft}! Please complete it soon.`
        : `"${taskTitle}" is due tomorrow. Make sure to complete it on time.`,
      context: "task_update",
      priority: isSameDay ? "urgent" as const : "high" as const,
    }),
    overdue: (taskTitle: string) => ({
      title: "Task Overdue",
      message: `"${taskTitle}" is now overdue. Please complete it as soon as possible or contact your supervisor.`,
      context: "task_update",
      priority: "urgent" as const,
    }),
  },

  // Leave request notifications
  leaveRequest: {
    submitted: (employeeName: string, leaveType: string, startDate: string, endDate: string) => ({
      title: "Leave Request Needs Review",
      message: `${employeeName} requested ${leaveType} leave (${startDate} - ${endDate}). Please review and respond.`,
      context: "leave_request",
      priority: "normal" as const,
    }),
    approved: (leaveType: string, startDate: string, endDate: string) => ({
      title: "Leave Approved",
      message: `Good news! Your ${leaveType} leave from ${startDate} to ${endDate} has been approved. Enjoy your time off!`,
      context: "leave_request",
      priority: "high" as const,
    }),
    rejected: (leaveType: string, reason: string) => ({
      title: "Leave Request Not Approved",
      message: `Your ${leaveType} leave request was not approved. Reason: ${reason}. Please contact your supervisor if you have questions.`,
      context: "leave_request",
      priority: "high" as const,
    }),
  },

  // Project notifications
  project: {
    assigned: (projectName: string, role: string) => ({
      title: "You've Been Added to a Project",
      message: `You're now the ${role} on "${projectName}". Check the project details to get started.`,
      context: "project_update",
      priority: "normal" as const,
    }),
    milestone: (projectName: string, milestoneName: string) => ({
      title: "Milestone Achieved",
      message: `"${milestoneName}" is complete in "${projectName}". Great progress!`,
      context: "project_update",
      priority: "normal" as const,
    }),
    deadline: (projectName: string, daysLeft: number) => ({
      title: daysLeft <= 1 ? "Project Due Tomorrow" : "Project Deadline Reminder",
      message: daysLeft <= 1 
        ? `"${projectName}" is due tomorrow! Make sure all tasks are completed.`
        : `"${projectName}" is due in ${daysLeft} days. Review your pending tasks.`,
      context: "project_update",
      priority: daysLeft <= 3 ? "urgent" as const : "high" as const,
    }),
    completed: (projectName: string) => ({
      title: "Project Completed! 🎉",
      message: `Congratulations! The project "${projectName}" has been successfully completed. Great teamwork!`,
      context: "project_update",
      priority: "high" as const,
    }),
  },

  // Employee notifications
  employee: {
    welcome: (employeeName: string) => ({
      title: "Welcome Aboard",
      message: `Hi ${employeeName}! Your account is now active. Explore your dashboard to get started with the HRIS system.`,
      context: "employee_update",
      priority: "normal" as const,
    }),
    profileUpdate: (field: string) => ({
      title: "Profile Updated",
      message: `Your ${field} has been saved successfully.`,
      context: "employee_update",
      priority: "low" as const,
    }),
    documentRequired: (documentType: string) => ({
      title: "Action Required: Missing Document",
      message: `Please upload your ${documentType} to complete your profile setup. This is required for HR compliance.`,
      context: "employee_update",
      priority: "high" as const,
    }),
  },

  // Attendance notifications
  attendance: {
    lateCheckIn: (siteName: string, time: string) => ({
      title: "Late Arrival Recorded",
      message: `You checked in at ${time} at ${siteName}. If this was due to an approved reason, please notify your supervisor.`,
      context: "attendance",
      priority: "normal" as const,
    }),
    missedCheckOut: (siteName: string) => ({
      title: "Missing Check-out",
      message: `You didn't check out from ${siteName} yesterday. Please contact HR to correct your attendance record.`,
      context: "attendance",
      priority: "high" as const,
    }),
    requestSubmitted: (employeeName: string, requestType: string, date: string) => ({
      title: "Attendance Request Needs Review",
      message: `${employeeName} submitted an attendance ${requestType} request for ${date}. Please review.`,
      context: "attendance",
      priority: "normal" as const,
    }),
    requestApproved: (requestType: string, date: string) => ({
      title: "Attendance Request Approved",
      message: `Your attendance ${requestType} request for ${date} has been approved.`,
      context: "attendance",
      priority: "normal" as const,
    }),
    requestRejected: (requestType: string, date: string, reason?: string) => ({
      title: "Attendance Request Rejected",
      message: `Your attendance ${requestType} request for ${date} was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      context: "attendance",
      priority: "normal" as const,
    }),
  },

  // Milestone notifications
  milestone: {
    completed: (milestoneName: string, projectName: string) => ({
      title: "Milestone Completed",
      message: `The milestone "${milestoneName}" in project "${projectName}" has been completed.`,
      context: "milestone_update",
      priority: "normal" as const,
    }),
  },

  // Onboarding notifications (always sent - no preference)
  onboarding: {
    approved: (employeeName: string) => ({
      title: "Welcome to the Team!",
      message: `Hi ${employeeName}, your account has been approved! You can now access all features of the system.`,
      context: "onboarding",
      priority: "high" as const,
    }),
    rejected: (employeeName: string, reason?: string) => ({
      title: "Account Application Update",
      message: `Hi ${employeeName}, your account application was not approved.${reason ? ` Reason: ${reason}` : ''} Please contact HR for more information.`,
      context: "onboarding",
      priority: "high" as const,
    }),
    pendingReview: (employeeName: string) => ({
      title: "New Employee Pending Approval",
      message: `${employeeName} has submitted their onboarding information and is awaiting approval.`,
      context: "onboarding",
      priority: "normal" as const,
    }),
  },

  // Offboarding notifications (always sent - no preference)
  offboarding: {
    processed: (employeeName: string, offboardingType: string) => ({
      title: "Offboarding Processed",
      message: `${employeeName} has been ${offboardingType.toLowerCase()}. Please ensure all handover tasks are completed.`,
      context: "offboarding",
      priority: "high" as const,
    }),
    reactivated: (employeeName: string) => ({
      title: "Account Reactivated",
      message: `Hi ${employeeName}, your account has been reactivated. Welcome back!`,
      context: "offboarding",
      priority: "high" as const,
    }),
  },

  // Device management notifications
  device: {
    approved: (deviceInfo: string) => ({
      title: "Device Approved",
      message: `Your device (${deviceInfo}) has been approved. You can now access the system from this device.`,
      context: "device",
      priority: "normal" as const,
    }),
    rejected: (deviceInfo: string, reason?: string) => ({
      title: "Device Not Approved",
      message: `Your device (${deviceInfo}) was not approved.${reason ? ` Reason: ${reason}` : ''} Please contact your administrator.`,
      context: "device",
      priority: "high" as const,
    }),
    limitExceeded: (currentCount: number, maxLimit: number) => ({
      title: "Device Limit Exceeded",
      message: `You have ${currentCount} devices registered, which exceeds the limit of ${maxLimit}. Please remove unused devices from your profile settings.`,
      context: "device",
      priority: "high" as const,
    }),
  },

  // System notifications
  system: {
    maintenance: (startTime: string, duration: string) => ({
      title: "Scheduled Maintenance",
      message: `The system will be under maintenance on ${startTime} for approximately ${duration}. Please save your work before this time.`,
      context: "system_alert",
      priority: "high" as const,
    }),
    update: (version: string, features: string) => ({
      title: "New Features Available",
      message: `We've updated to version ${version} with new features: ${features}. Check them out!`,
      context: "system_alert",
      priority: "normal" as const,
    }),
  },

  // Payroll notifications
  payroll: {
    generated: (employeeName: string, amount: number, date: string) => ({
      title: "Payroll Generated",
      message: `Your payroll for ${date} (৳${amount.toLocaleString()}) has been generated and is pending approval.`,
      context: "payroll",
      priority: "normal" as const,
    }),
    published: (employeeName: string, newAmount: number, adjustmentReason: string) => ({
      title: "Payroll Ready for Review",
      message: `Your payroll (৳${newAmount.toLocaleString()}) has been finalized${adjustmentReason ? ` with adjustments: ${adjustmentReason}` : ''}. Review your payslip for details.`,
      context: "payroll",
      priority: "high" as const,
    }),
    paid: (employeeName: string, amount: number, date: string) => ({
      title: "Payment Processed",
      message: `Your salary of ৳${amount.toLocaleString()} for ${date} has been transferred to your account.`,
      context: "payroll",
      priority: "normal" as const,
    }),
    supervisorPending: (employeeName: string, amount: number, date: string) => ({
      title: "Payroll Awaiting Your Approval",
      message: `${employeeName}'s payroll (৳${amount.toLocaleString()}) for ${date} needs your review and approval.`,
      context: "payroll",
      priority: "normal" as const,
    }),
  },

  // Account-related notifications  
  account: {
    transactionCreated: (title: string, amount: number, currency: string) => ({
      title: "Transaction Recorded",
      message: `"${title}" (${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ${currency}) has been added to accounts.`,
      context: "account",
      priority: "normal" as const,
    }),
    stakeholderTransaction: (title: string, amount: number, currency: string, stakeholderName: string) => ({
      title: `Transaction for ${stakeholderName}`,
      message: `"${title}" (${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ${currency}) recorded for ${stakeholderName}.`,
      context: "stakeholder_account",
      priority: "normal" as const,
    }),
    payrollLogged: (employeeName: string, amount: number, date: string) => ({
      title: "Payroll Entry Added",
      message: `${employeeName}'s salary (৳${Math.abs(amount).toLocaleString()}) for ${date} logged to accounts.`,
      context: "account",
      priority: "low" as const,
    }),
    largeTransaction: (title: string, amount: number, currency: string) => ({
      title: "Large Transaction Alert",
      message: `"${title}" for ${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ${currency} exceeds the threshold. Please verify this transaction.`,
      context: "account", 
      priority: "high" as const,
    }),
    stakeholderLargeTransaction: (title: string, amount: number, currency: string, stakeholderName: string) => ({
      title: `Large Transaction: ${stakeholderName}`,
      message: `"${title}" (${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ${currency}) for ${stakeholderName} exceeds the threshold. Please verify.`,
      context: "stakeholder_account",
      priority: "high" as const,
    }),
    statusChanged: (title: string, oldStatus: string, newStatus: string) => ({
      title: "Transaction Updated",
      message: `"${title}" moved from ${oldStatus} to ${newStatus}.`,
      context: "account",
      priority: "normal" as const,
    }),
  },

  // Stakeholder-related notifications
  stakeholder: {
    created: (stakeholderName: string, processName: string) => ({
      title: "New Stakeholder Assigned to You",
      message: `You've been assigned as KAM for "${stakeholderName}" (${processName}). Review their details to begin the process.`,
      context: "stakeholder",
      priority: "normal" as const,
    }),
    updated: (stakeholderName: string) => ({
      title: "Stakeholder Info Updated",
      message: `Details for "${stakeholderName}" have been modified. Review the changes if needed.`,
      context: "stakeholder",
      priority: "normal" as const,
    }),
    statusChanged: (stakeholderName: string, oldStatus: string, newStatus: string) => ({
      title: `${stakeholderName}: Status Changed`,
      message: `"${stakeholderName}" has moved from ${oldStatus} to ${newStatus}. ${newStatus === 'Permanent' ? 'Congratulations on the conversion!' : 'Check if any action is needed.'}`,
      context: "stakeholder",
      priority: "high" as const,
    }),
    rejected: (stakeholderName: string, reason: string) => ({
      title: `Stakeholder Rejected: ${stakeholderName}`,
      message: `"${stakeholderName}" has been rejected. Reason: ${reason}. Contact your supervisor for next steps.`,
      context: "stakeholder",
      priority: "high" as const,
    }),
    completed: (stakeholderName: string) => ({
      title: "Process Complete",
      message: `All steps for "${stakeholderName}" are done! They're now a permanent stakeholder.`,
      context: "stakeholder",
      priority: "high" as const,
    }),
    stepCompleted: (stakeholderName: string, stepName: string) => ({
      title: `Step Complete: ${stepName}`,
      message: `"${stepName}" is done for "${stakeholderName}". The process moves to the next stage.`,
      context: "stakeholder_step",
      priority: "normal" as const,
    }),
    stepUpdated: (stakeholderName: string, stepName: string) => ({
      title: `Step Updated: ${stepName}`,
      message: `New information added to "${stepName}" for "${stakeholderName}". Review the updates.`,
      context: "stakeholder_step",
      priority: "normal" as const,
    }),
    stepRolledBack: (stakeholderName: string, stepName: string) => ({
      title: `Step Rolled Back: ${stepName}`,
      message: `"${stepName}" for "${stakeholderName}" has been reverted and needs to be redone. Check the reason and take action.`,
      context: "stakeholder_step",
      priority: "high" as const,
    }),
    assignedToTeam: (stakeholderName: string, stepName: string, teamName: string) => ({
      title: "New Work Assigned to Your Team",
      message: `"${stakeholderName}" is ready for "${stepName}". Your team (${teamName}) can now work on this step.`,
      context: "stakeholder_step",
      priority: "normal" as const,
    }),
  },

  // Stakeholder issue notifications
  stakeholderIssue: {
    created: (stakeholderName: string, issueTitle: string, priority: string) => {
      const notificationPriority = (priority === 'High' || priority === 'Urgent' ? "high" : "normal") as 'high' | 'normal';
      return {
        title: `Issue Reported: ${stakeholderName}`,
        message: `${priority} priority issue "${issueTitle}" needs attention for "${stakeholderName}".`,
        context: "stakeholder_issue",
        priority: notificationPriority,
      };
    },
    assigned: (stakeholderName: string, issueTitle: string) => ({
      title: "Issue Assigned to You",
      message: `You've been assigned to resolve "${issueTitle}" for "${stakeholderName}". Please review and take action.`,
      context: "stakeholder_issue",
      priority: "high" as const,
    }),
    statusChanged: (stakeholderName: string, issueTitle: string, newStatus: string) => ({
      title: `Issue Update: ${issueTitle}`,
      message: `"${issueTitle}" for "${stakeholderName}" is now ${newStatus}.`,
      context: "stakeholder_issue",
      priority: "normal" as const,
    }),
    resolved: (stakeholderName: string, issueTitle: string) => ({
      title: "Issue Resolved",
      message: `"${issueTitle}" for "${stakeholderName}" has been resolved. The process can continue.`,
      context: "stakeholder_issue",
      priority: "normal" as const,
    }),
    pendingCheckerApproval: (stakeholderName: string, issueTitle: string, teamName: string) => ({
      title: "Approval Required",
      message: `Issue "${issueTitle}" for "${stakeholderName}" requires your team's (${teamName}) approval before it can be marked as resolved.`,
      context: "stakeholder_issue",
      priority: "high" as const,
    }),
  },
};

// Helper functions to create notifications
export const createLeaveRequestNotification = async (
  recipientId: string,
  type: 'submitted' | 'approved' | 'rejected',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'submitted':
      template = NotificationTemplates.leaveRequest.submitted(
        data.employeeName,
        data.leaveType,
        data.startDate,
        data.endDate
      );
      break;
    case 'approved':
      template = NotificationTemplates.leaveRequest.approved(
        data.leaveType,
        data.startDate,
        data.endDate
      );
      break;
    case 'rejected':
      template = NotificationTemplates.leaveRequest.rejected(
        data.leaveType,
        data.reason
      );
      break;
    default:
      throw new Error('Invalid leave request notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

export const createProjectNotification = async (
  recipientId: string,
  type: 'assigned' | 'milestone' | 'deadline',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'assigned':
      template = NotificationTemplates.project.assigned(data.projectName, data.role);
      break;
    case 'milestone':
      template = NotificationTemplates.project.milestone(data.projectName, data.milestoneName);
      break;
    case 'deadline':
      template = NotificationTemplates.project.deadline(data.projectName, data.daysLeft);
      break;
    default:
      throw new Error('Invalid project notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

export const createEmployeeNotification = async (
  recipientId: string,
  type: 'welcome' | 'profileUpdate' | 'documentRequired',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'welcome':
      template = NotificationTemplates.employee.welcome(data.employeeName);
      break;
    case 'profileUpdate':
      template = NotificationTemplates.employee.profileUpdate(data.field);
      break;
    case 'documentRequired':
      template = NotificationTemplates.employee.documentRequired(data.documentType);
      break;
    default:
      throw new Error('Invalid employee notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

export const createAttendanceNotification = async (
  recipientId: string,
  type: 'lateCheckIn' | 'missedCheckOut',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'lateCheckIn':
      template = NotificationTemplates.attendance.lateCheckIn(data.siteName, data.time);
      break;
    case 'missedCheckOut':
      template = NotificationTemplates.attendance.missedCheckOut(data.siteName);
      break;
    default:
      throw new Error('Invalid attendance notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

export const createSystemNotificationHelper = async (
  recipientId: string,
  type: 'maintenance' | 'update',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'maintenance':
      template = NotificationTemplates.system.maintenance(data.startTime, data.duration);
      break;
    case 'update':
      template = NotificationTemplates.system.update(data.version, data.features);
      break;
    default:
      throw new Error('Invalid system notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

// Payroll notification helper
export const createPayrollNotification = async (
  recipientId: string,
  type: 'generated' | 'published' | 'paid' | 'supervisorPending',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'generated':
      template = NotificationTemplates.payroll.generated(data.employeeName, data.amount, data.date);
      break;
    case 'published':
      template = NotificationTemplates.payroll.published(data.employeeName, data.newAmount, data.adjustmentReason);
      break;
    case 'paid':
      template = NotificationTemplates.payroll.paid(data.employeeName, data.amount, data.date);
      break;
    case 'supervisorPending':
      template = NotificationTemplates.payroll.supervisorPending(data.employeeName, data.amount, data.date);
      break;
    default:
      throw new Error('Invalid payroll notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

// Account notification helper
export const createAccountNotification = async (
  recipientId: string,
  type: 'transactionCreated' | 'payrollLogged' | 'largeTransaction' | 'statusChanged' | 'stakeholderTransaction' | 'stakeholderLargeTransaction',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'transactionCreated':
      template = NotificationTemplates.account.transactionCreated(data.title, data.amount, data.currency);
      break;
    case 'stakeholderTransaction':
      template = NotificationTemplates.account.stakeholderTransaction(data.title, data.amount, data.currency, data.stakeholderName);
      break;
    case 'payrollLogged':
      template = NotificationTemplates.account.payrollLogged(data.employeeName, data.amount, data.date);
      break;
    case 'largeTransaction':
      template = NotificationTemplates.account.largeTransaction(data.title, data.amount, data.currency);
      break;
    case 'stakeholderLargeTransaction':
      template = NotificationTemplates.account.stakeholderLargeTransaction(data.title, data.amount, data.currency, data.stakeholderName);
      break;
    case 'statusChanged':
      template = NotificationTemplates.account.statusChanged(data.title, data.oldStatus, data.newStatus);
      break;
    default:
      throw new Error('Invalid account notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

// Stakeholder notification helper
export const createStakeholderNotification = async (
  recipientId: string,
  type: 'created' | 'updated' | 'statusChanged' | 'rejected' | 'completed' | 'stepCompleted' | 'stepUpdated' | 'stepRolledBack' | 'assignedToTeam',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  try {
    let template;
    
    switch (type) {
      case 'created':
        template = NotificationTemplates.stakeholder.created(data.stakeholderName, data.processName);
        break;
      case 'updated':
        template = NotificationTemplates.stakeholder.updated(data.stakeholderName);
        break;
      case 'statusChanged':
        template = NotificationTemplates.stakeholder.statusChanged(data.stakeholderName, data.oldStatus, data.newStatus);
        break;
      case 'rejected':
        template = NotificationTemplates.stakeholder.rejected(data.stakeholderName, data.reason);
        break;
      case 'completed':
        template = NotificationTemplates.stakeholder.completed(data.stakeholderName);
        break;
      case 'stepCompleted':
        template = NotificationTemplates.stakeholder.stepCompleted(data.stakeholderName, data.stepName);
        break;
      case 'stepUpdated':
        template = NotificationTemplates.stakeholder.stepUpdated(data.stakeholderName, data.stepName);
        break;
      case 'stepRolledBack':
        template = NotificationTemplates.stakeholder.stepRolledBack(data.stakeholderName, data.stepName);
        break;
      case 'assignedToTeam':
        template = NotificationTemplates.stakeholder.assignedToTeam(data.stakeholderName, data.stepName, data.teamName);
        break;
      default:
        throw new Error('Invalid stakeholder notification type');
    }

    const companyId = await getCompanyId();
    return await createSystemNotification(
      recipientId,
      template.title,
      template.message,
      companyId,
      {
        priority: template.priority,
        context: template.context,
        referenceId: options.referenceId,
        actionUrl: options.actionUrl,
      }
    );
  } catch (error) {
    const errorContext = {
      recipientId,
      type,
      data,
      options,
      operation: 'createStakeholderNotification'
    };
    
    console.error('Error in createStakeholderNotification:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      ...errorContext
    });
    
    // Capture to Sentry
    captureError(error, errorContext, 'error');
    
    // Re-throw to let the caller handle it
    throw error;
  }
};

// Stakeholder issue notification helper
export const createStakeholderIssueNotification = async (
  recipientId: string,
  type: 'created' | 'assigned' | 'statusChanged' | 'resolved' | 'pendingCheckerApproval',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'created':
      template = NotificationTemplates.stakeholderIssue.created(data.stakeholderName, data.issueTitle, data.priority);
      break;
    case 'assigned':
      template = NotificationTemplates.stakeholderIssue.assigned(data.stakeholderName, data.issueTitle);
      break;
    case 'statusChanged':
      template = NotificationTemplates.stakeholderIssue.statusChanged(data.stakeholderName, data.issueTitle, data.newStatus);
      break;
    case 'resolved':
      template = NotificationTemplates.stakeholderIssue.resolved(data.stakeholderName, data.issueTitle);
      break;
    case 'pendingCheckerApproval':
      template = NotificationTemplates.stakeholderIssue.pendingCheckerApproval(data.stakeholderName, data.issueTitle, data.teamName);
      break;
    default:
      throw new Error('Invalid stakeholder issue notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

// Task notification helper
export const createTaskNotification = async (
  recipientId: string,
  type: 'completed' | 'deadlineApproaching' | 'overdue',
  data: any,
  options: { referenceId?: string; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'completed':
      template = NotificationTemplates.task.completed(data.taskTitle, data.completedByName);
      break;
    case 'deadlineApproaching':
      template = NotificationTemplates.task.deadlineApproaching(data.taskTitle, data.timeLeft, data.isSameDay);
      break;
    case 'overdue':
      template = NotificationTemplates.task.overdue(data.taskTitle);
      break;
    default:
      throw new Error('Invalid task notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId ? parseInt(options.referenceId) : undefined,
      actionUrl: options.actionUrl,
    }
  );
};

// Milestone notification helper
export const createMilestoneNotification = async (
  recipientId: string,
  type: 'completed',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'completed':
      template = NotificationTemplates.milestone.completed(data.milestoneName, data.projectName);
      break;
    default:
      throw new Error('Invalid milestone notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};

// Onboarding notification helper (always sent - no user preference)
export const createOnboardingNotification = async (
  recipientId: string,
  type: 'approved' | 'rejected' | 'pendingReview',
  data: any,
  options: { referenceId?: string; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'approved':
      template = NotificationTemplates.onboarding.approved(data.employeeName);
      break;
    case 'rejected':
      template = NotificationTemplates.onboarding.rejected(data.employeeName, data.reason);
      break;
    case 'pendingReview':
      template = NotificationTemplates.onboarding.pendingReview(data.employeeName);
      break;
    default:
      throw new Error('Invalid onboarding notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId ? parseInt(options.referenceId) : undefined,
      actionUrl: options.actionUrl,
    }
  );
};

// Offboarding notification helper (always sent - no user preference)
export const createOffboardingNotification = async (
  recipientId: string,
  type: 'processed' | 'reactivated',
  data: any,
  options: { referenceId?: string; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'processed':
      template = NotificationTemplates.offboarding.processed(data.employeeName, data.offboardingType);
      break;
    case 'reactivated':
      template = NotificationTemplates.offboarding.reactivated(data.employeeName);
      break;
    default:
      throw new Error('Invalid offboarding notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId ? parseInt(options.referenceId) : undefined,
      actionUrl: options.actionUrl,
    }
  );
};

// Device notification helper
export const createDeviceNotification = async (
  recipientId: string,
  type: 'approved' | 'rejected' | 'limitExceeded',
  data: any,
  options: { referenceId?: string; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'approved':
      template = NotificationTemplates.device.approved(data.deviceInfo);
      break;
    case 'rejected':
      template = NotificationTemplates.device.rejected(data.deviceInfo, data.reason);
      break;
    case 'limitExceeded':
      template = NotificationTemplates.device.limitExceeded(data.currentCount, data.maxLimit);
      break;
    default:
      throw new Error('Invalid device notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId ? parseInt(options.referenceId) : undefined,
      actionUrl: options.actionUrl,
    }
  );
};

// Attendance request notification helper
export const createAttendanceRequestNotification = async (
  recipientId: string,
  type: 'requestSubmitted' | 'requestApproved' | 'requestRejected',
  data: any,
  options: { referenceId?: number; actionUrl?: string } = {}
) => {
  let template;
  
  switch (type) {
    case 'requestSubmitted':
      template = NotificationTemplates.attendance.requestSubmitted(data.employeeName, data.requestType, data.date);
      break;
    case 'requestApproved':
      template = NotificationTemplates.attendance.requestApproved(data.requestType, data.date);
      break;
    case 'requestRejected':
      template = NotificationTemplates.attendance.requestRejected(data.requestType, data.date, data.reason);
      break;
    default:
      throw new Error('Invalid attendance request notification type');
  }

  const companyId = await getCompanyId();
  return await createSystemNotification(
    recipientId,
    template.title,
    template.message,
    companyId,
    {
      priority: template.priority,
      context: template.context,
      referenceId: options.referenceId,
      actionUrl: options.actionUrl,
    }
  );
};
