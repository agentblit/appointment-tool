import type { AppointmentAvailabilityRuleRow } from "@/lib/appointment/schema";

export type AvailabilityRuleInput = Pick<
  AppointmentAvailabilityRuleRow,
  "dayOfWeek" | "startTime" | "endTime"
>;

export type ConfirmedAppointmentSlot = {
  startTime: Date;
  endTime: Date;
  status: string;
};

export type GeneratedTimeSlot = {
  start: string;
  end: string;
};

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time value: ${time}`);
  }
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Format an instant as `YYYY-MM-DD HH:MM` in the given IANA timezone. */
export function formatDateTimeInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${read("year")}-${read("month")}-${read("day")} ${hour}:${read("minute")}`;
}

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert an inclusive calendar day range in `timezone` to UTC bounds.
 * `utcToExclusive` is the instant of the next local midnight after dateTo.
 */
export function userDateRangeToUtcBounds(
  dateFrom: string,
  dateTo: string,
  timezone: string,
): { utcFrom: Date; utcToExclusive: Date } {
  const utcFrom = zonedDateTimeToUtc(dateFrom, "00:00", timezone);
  const endNoon = zonedDateTimeToUtc(dateTo, "12:00", timezone);
  const nextLocalDate = formatDateInTimezone(
    new Date(endNoon.getTime() + 24 * 60 * 60 * 1000),
    timezone,
  );
  return {
    utcFrom,
    utcToExclusive: zonedDateTimeToUtc(nextLocalDate, "00:00", timezone),
  };
}

export function getWeekdayInTimezone(date: Date, timezone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
  return WEEKDAY_TO_INDEX[weekday] ?? 0;
}

export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string,
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = new Date(utcMs);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(current);

    const read = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);

    const actualYear = read("year");
    const actualMonth = read("month");
    const actualDay = read("day");
    const actualHour = read("hour") % 24;
    const actualMinute = read("minute");

    const targetTotalMinutes = hour * 60 + minute;
    const actualTotalMinutes = actualHour * 60 + actualMinute;
    const dayOffsetMinutes =
      (actualYear - year) * 525_600 +
      (actualMonth - month) * 43_200 +
      (actualDay - day) * 1_440;
    const diffMinutes = dayOffsetMinutes + (actualTotalMinutes - targetTotalMinutes);
    if (diffMinutes === 0) {
      return current;
    }
    utcMs -= diffMinutes * 60_000;
  }

  return new Date(utcMs);
}

function iterateDateStrings(
  dateFrom: string,
  dateTo: string,
  timezone: string,
): string[] {
  const dates: string[] = [];
  let current = dateFrom;
  while (current <= dateTo) {
    dates.push(current);
    const noonUtc = zonedDateTimeToUtc(current, "12:00", timezone);
    const next = new Date(noonUtc.getTime() + 24 * 60 * 60 * 1000);
    current = formatDateInTimezone(next, timezone);
    if (dates.length > 366) {
      break;
    }
  }
  return dates;
}

function slotsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function generateAvailableSlots(options: {
  rules: AvailabilityRuleInput[];
  existingAppointments: ConfirmedAppointmentSlot[];
  dateFrom: string;
  dateTo: string;
  slotDurationMinutes: number;
  timezone: string;
  now?: Date;
}): GeneratedTimeSlot[] {
  const {
    rules,
    existingAppointments,
    dateFrom,
    dateTo,
    slotDurationMinutes,
    timezone,
    now = new Date(),
  } = options;

  const slots: GeneratedTimeSlot[] = [];
  const confirmed = existingAppointments.filter(
    (appointment) => appointment.status === "confirmed",
  );

  for (const dateStr of iterateDateStrings(dateFrom, dateTo, timezone)) {
    const weekday = getWeekdayInTimezone(
      zonedDateTimeToUtc(dateStr, "12:00", timezone),
      timezone,
    );
    const dayRules = rules.filter((rule) => rule.dayOfWeek === weekday);

    for (const rule of dayRules) {
      const ruleStart = parseTimeToMinutes(rule.startTime);
      const ruleEnd = parseTimeToMinutes(rule.endTime);
      if (ruleEnd <= ruleStart) {
        continue;
      }

      for (
        let slotStartMinutes = ruleStart;
        slotStartMinutes + slotDurationMinutes <= ruleEnd;
        slotStartMinutes += slotDurationMinutes
      ) {
        const slotEndMinutes = slotStartMinutes + slotDurationMinutes;
        const slotStart = zonedDateTimeToUtc(
          dateStr,
          minutesToTimeString(slotStartMinutes),
          timezone,
        );
        const slotEnd = zonedDateTimeToUtc(
          dateStr,
          minutesToTimeString(slotEndMinutes),
          timezone,
        );

        if (slotStart < now) {
          continue;
        }

        const hasConflict = confirmed.some((appointment) =>
          slotsOverlap(
            slotStart,
            slotEnd,
            appointment.startTime,
            appointment.endTime,
          ),
        );
        if (hasConflict) {
          continue;
        }

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

export function isSlotWithinAvailability(options: {
  rules: AvailabilityRuleInput[];
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
}): boolean {
  const { rules, slotStart, slotEnd, timezone } = options;
  const dateStr = formatDateInTimezone(slotStart, timezone);
  const weekday = getWeekdayInTimezone(slotStart, timezone);
  const startMinutes = parseTimeToMinutes(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(slotStart),
  );
  const endMinutes = parseTimeToMinutes(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(slotEnd),
  );

  if (formatDateInTimezone(slotEnd, timezone) !== dateStr) {
    return false;
  }

  return rules.some((rule) => {
    if (rule.dayOfWeek !== weekday) {
      return false;
    }
    const ruleStart = parseTimeToMinutes(rule.startTime);
    const ruleEnd = parseTimeToMinutes(rule.endTime);
    return startMinutes >= ruleStart && endMinutes <= ruleEnd;
  });
}

export function validateAvailabilityRules(
  rules: AvailabilityRuleInput[],
): string | null {
  for (const rule of rules) {
    if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
      return "Day of week must be between 0 and 6";
    }
    const start = parseTimeToMinutes(rule.startTime);
    const end = parseTimeToMinutes(rule.endTime);
    if (end <= start) {
      return "Availability end time must be after start time";
    }
  }
  return null;
}
