import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/appointment/process-reminders";

export const dynamic = "force-dynamic";

function authorize(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return false;
  }

  return header.slice(7).trim() === secret;
}

/**
 * Process due appointment reminders.
 *
 * Call every ~3 minutes from an external cron / scheduler:
 *   curl -X POST -H "Authorization: Bearer $REMINDER_CRON_SECRET" \
 *     "$PUBLIC_BASE_URL/api/reminders/process"
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    console.warn("[reminders/process] unauthorized");
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueReminders();
    console.log(
      `[reminders/process] examined=${result.examined} sent=${result.sent} failed=${result.failed}`,
    );
    if (result.errors.length > 0) {
      console.error("[reminders/process] errors", result.errors);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process reminders";
    console.error("[reminders/process] failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
