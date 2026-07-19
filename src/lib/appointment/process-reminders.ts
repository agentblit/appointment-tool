import {
  listDueReminders,
  markReminderSent,
} from "@/lib/appointment/repo";
import { sendAppointmentReminderEmail } from "@/lib/appointment/send-reminder-email";

export type ProcessRemindersResult = {
  examined: number;
  sent: number;
  failed: number;
  errors: { appointmentId: string; error: string }[];
};

export async function processDueReminders(): Promise<ProcessRemindersResult> {
  const due = await listDueReminders();
  const errors: ProcessRemindersResult["errors"] = [];
  let sent = 0;

  for (const row of due) {
    try {
      await sendAppointmentReminderEmail(row);
      const marked = await markReminderSent(row.appointment.id);
      if (!marked) {
        // Another worker already claimed this row after we sent.
        continue;
      }
      sent += 1;
    } catch (error) {
      errors.push({
        appointmentId: row.appointment.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    examined: due.length,
    sent,
    failed: errors.length,
    errors,
  };
}
