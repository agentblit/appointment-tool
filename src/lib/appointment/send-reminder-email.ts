import { Resend } from "resend";
import { formatDateTimeInTimezone } from "@/lib/appointment/appointment-utils";
import type { DueReminderRow } from "@/lib/appointment/repo";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

function getFromAddress() {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL");
  }
  return from;
}

export async function sendAppointmentReminderEmail(row: DueReminderRow) {
  const { appointment, entity, connector } = row;
  const startLocal = formatDateTimeInTimezone(
    appointment.startTime,
    connector.timezone,
  );
  const endLocal = formatDateTimeInTimezone(
    appointment.endTime,
    connector.timezone,
  );

  const subject = `Reminder: appointment with ${entity.name} in ${connector.reminderWindowMinutes} min`;
  const html = `
    <p>Hi ${escapeHtml(appointment.bookerName)},</p>
    <p>This is a reminder that your appointment is coming up soon.</p>
    <ul>
      <li><strong>${escapeHtml(connector.entityLabel)}:</strong> ${escapeHtml(entity.name)}</li>
      <li><strong>Starts:</strong> ${escapeHtml(startLocal)} (${escapeHtml(connector.timezone)})</li>
      <li><strong>Ends:</strong> ${escapeHtml(endLocal)}</li>
    </ul>
    <p>See you soon.</p>
  `.trim();

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: appointment.bookerEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message ?? "Failed to send reminder email");
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
