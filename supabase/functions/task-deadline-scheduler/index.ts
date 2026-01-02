// Supabase Edge Function: Task Deadline Scheduler
// Deploy: supabase functions deploy task-deadline-scheduler
// Schedule in Supabase Dashboard: Cron trigger every 6 hours -> 0 */6 * * *

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

interface TaskRecord {
  id: string;
  task_title: string;
  end_date: string;
  status: string;
  assignees: string[];
  created_by: string;
  company_id: number;
  deadline_notification_sent: boolean;
  overdue_notification_sent: boolean;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  users: { id: string };
}

serve(async (_req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      approachingNotificationsSent: 0,
      overdueNotificationsSent: 0,
      errors: [] as string[],
    };

    // Helper function to get employee with user info
    async function getEmployeeWithUser(employeeId: string): Promise<Employee | null> {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, users!inner(id)")
        .eq("id", employeeId)
        .single();
      
      if (error || !data) return null;
      return data as unknown as Employee;
    }

    // 1. Find tasks with deadlines approaching (within 24 hours)
    // Note: status is boolean (true = completed, false = not completed)
    const { data: approachingTasks, error: approachingError } = await supabase
      .from("task_records")
      .select("id, task_title, end_date, status, assignees, created_by, company_id, deadline_notification_sent")
      .eq("status", false)
      .gte("end_date", now.toISOString())
      .lte("end_date", oneDayFromNow.toISOString())
      .or("deadline_notification_sent.is.null,deadline_notification_sent.eq.false");

    if (approachingError) {
      console.error("Error fetching approaching tasks:", approachingError);
      stats.errors.push(`Approaching tasks query failed: ${approachingError.message}`);
    } else if (approachingTasks && approachingTasks.length > 0) {
      for (const task of approachingTasks as TaskRecord[]) {
        try {
          if (!task.assignees || task.assignees.length === 0) continue;

          const deadline = new Date(task.end_date);
          const hoursUntilDeadline = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
          const isSameDay = deadline.toDateString() === now.toDateString();
          const timeLeft = isSameDay
            ? `${hoursUntilDeadline} hour${hoursUntilDeadline !== 1 ? "s" : ""}`
            : "1 day";

          // Notify all assignees
          for (const assigneeId of task.assignees) {
            const assignee = await getEmployeeWithUser(assigneeId);
            if (!assignee?.users?.id) continue;

            const { error: notifError } = await supabase
              .from("notifications")
              .insert({
                user_id: assignee.users.id,
                title: "Task Deadline Approaching",
                message: `"${task.task_title}" is due in ${timeLeft}. ${isSameDay ? "Please prioritize!" : "Make sure to complete it on time."}`,
                type_id: 1,
                priority: isSameDay ? "high" : "normal",
                context: "task",
                action_url: "/ops/task",
                reference_id: parseInt(task.id),
              });

            if (notifError) {
              stats.errors.push(`Notification failed for task ${task.id}: ${notifError.message}`);
            } else {
              stats.approachingNotificationsSent++;
            }
          }

          // Mark as notified
          await supabase
            .from("task_records")
            .update({ deadline_notification_sent: true })
            .eq("id", task.id);

        } catch (err) {
          stats.errors.push(`Error processing approaching task ${task.id}: ${err}`);
        }
      }
    }

    // 2. Find overdue tasks (1 day past due)
    // Note: status is boolean (true = completed, false = not completed)
    const { data: overdueTasks, error: overdueError } = await supabase
      .from("task_records")
      .select("id, task_title, end_date, status, assignees, created_by, company_id, overdue_notification_sent")
      .eq("status", false)
      .lt("end_date", oneDayAgo.toISOString())
      .or("overdue_notification_sent.is.null,overdue_notification_sent.eq.false");

    if (overdueError) {
      console.error("Error fetching overdue tasks:", overdueError);
      stats.errors.push(`Overdue tasks query failed: ${overdueError.message}`);
    } else if (overdueTasks && overdueTasks.length > 0) {
      for (const task of overdueTasks as TaskRecord[]) {
        try {
          // Notify all assignees
          if (task.assignees && task.assignees.length > 0) {
            for (const assigneeId of task.assignees) {
              const assignee = await getEmployeeWithUser(assigneeId);
              if (!assignee?.users?.id) continue;

              const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                  user_id: assignee.users.id,
                  title: "Task Overdue",
                  message: `"${task.task_title}" is now overdue. Please complete it as soon as possible or contact your supervisor.`,
                  type_id: 1,
                  priority: "high",
                  context: "task",
                  action_url: "/ops/task",
                  reference_id: parseInt(task.id),
                });

              if (notifError) {
                stats.errors.push(`Overdue notification failed for assignee on task ${task.id}: ${notifError.message}`);
              } else {
                stats.overdueNotificationsSent++;
              }
            }
          }

          // Notify creator (supervisor) if different from assignees
          if (task.created_by && !task.assignees?.includes(task.created_by)) {
            const creator = await getEmployeeWithUser(task.created_by);
            if (creator?.users?.id) {
              // Get assignee names for the message
              const assigneeNames: string[] = [];
              for (const assigneeId of (task.assignees || [])) {
                const emp = await getEmployeeWithUser(assigneeId);
                if (emp) assigneeNames.push(`${emp.first_name} ${emp.last_name}`);
              }
              const assigneeNamesStr = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";

              const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                  user_id: creator.users.id,
                  title: "Task Overdue Alert",
                  message: `Task "${task.task_title}" assigned to ${assigneeNamesStr} is now overdue and requires attention.`,
                  type_id: 1,
                  priority: "high",
                  context: "task",
                  action_url: "/ops/task",
                  reference_id: parseInt(task.id),
                });

              if (notifError) {
                stats.errors.push(`Overdue notification failed for creator on task ${task.id}: ${notifError.message}`);
              } else {
                stats.overdueNotificationsSent++;
              }
            }
          }

          // Mark as notified for overdue
          await supabase
            .from("task_records")
            .update({ overdue_notification_sent: true })
            .eq("id", task.id);

        } catch (err) {
          stats.errors.push(`Error processing overdue task ${task.id}: ${err}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        stats: {
          approachingTasksFound: approachingTasks?.length || 0,
          overdueTasksFound: overdueTasks?.length || 0,
          ...stats,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Task deadline scheduler error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
