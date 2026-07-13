import { z } from "zod";
import { APPOINTMENT_SLOT_DURATION_MINUTES } from "@/lib/appointment/constants";

/** Matches agentblit `ToolPermissionMode` wire values. */
export enum ToolPermissionMode {
  AlwaysAllow = "always_allow",
  NeedsApproval = "needs_approval",
  Blocked = "blocked",
}

export type Tool = {
  name: string;
  description: string;
  parameters: object;
  permissionMode: ToolPermissionMode;
};

const ask = ToolPermissionMode.NeedsApproval;
const allow = ToolPermissionMode.AlwaysAllow;

export const APPOINTMENT_CONNECTOR_KEY = "appointment";

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const isoDateTimeSchema = z
  .string()
  .trim()
  .datetime({ offset: true, message: "Date-time must be ISO 8601" });

export const checkAvailableSlotsArgsSchema = z.object({
  entity_id: z.string().uuid("entity_id must be a valid UUID"),
  date_from: isoDateSchema,
  date_to: isoDateSchema,
});

export const bookAppointmentArgsSchema = z.object({
  entity_id: z.string().uuid("entity_id must be a valid UUID"),
  slot_start: isoDateTimeSchema,
  slot_end: isoDateTimeSchema,
  booker_name: z.string().trim().min(1, "booker_name is required"),
  booker_email: z.string().trim().email("booker_email must be a valid email"),
});

export const cancelAppointmentArgsSchema = z.object({
  appointment_id: z.string().uuid("appointment_id must be a valid UUID"),
});

export const rescheduleAppointmentArgsSchema = z.object({
  appointment_id: z.string().uuid("appointment_id must be a valid UUID"),
  new_slot_start: isoDateTimeSchema,
  new_slot_end: isoDateTimeSchema,
});

export const appointmentConnectorConfigSchema = z.object({
  entityLabel: z.string().trim().min(1, "Entity label is required").max(100),
  timezone: z.string().trim().min(1, "Timezone is required"),
  slotDurationMinutes: z
    .number()
    .int()
    .refine(
      (value) =>
        APPOINTMENT_SLOT_DURATION_MINUTES.includes(
          value as (typeof APPOINTMENT_SLOT_DURATION_MINUTES)[number],
        ),
      "Invalid slot duration",
    ),
  finalize: z.boolean().optional(),
});

export const appointmentEntitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().max(1000).optional(),
});

export const appointmentAvailabilityRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z
          .string()
          .trim()
          .regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM"),
        endTime: z
          .string()
          .trim()
          .regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM"),
      }),
    )
    .default([]),
});

export const APPOINTMENT_TOOLS: Tool[] = [
  {
    name: "list_entities",
    description:
      "List all configured bookable entities for this agent, including their IDs and descriptions.",
    parameters: {
      type: "object",
      properties: {},
    },
    permissionMode: allow,
  },
  {
    name: "check_available_slots",
    description:
      "Check available appointment slots for a configured entity within a date range.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: "UUID of the entity to check",
        },
        date_from: {
          type: "string",
          description: "Start date in YYYY-MM-DD",
        },
        date_to: {
          type: "string",
          description: "End date in YYYY-MM-DD",
        },
      },
      required: ["entity_id", "date_from", "date_to"],
    },
    permissionMode: allow,
  },
  {
    name: "book_appointment",
    description:
      "Book an appointment slot for a configured entity using the booker's name and email.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: "UUID of the entity to book",
        },
        slot_start: {
          type: "string",
          description: "Slot start time in ISO 8601",
        },
        slot_end: {
          type: "string",
          description: "Slot end time in ISO 8601",
        },
        booker_name: {
          type: "string",
          description: "Name of the person booking the appointment",
        },
        booker_email: {
          type: "string",
          description: "Email of the person booking the appointment",
        },
      },
      required: [
        "entity_id",
        "slot_start",
        "slot_end",
        "booker_name",
        "booker_email",
      ],
    },
    permissionMode: ask,
  },
  {
    name: "cancel_appointment",
    description: "Cancel an existing confirmed appointment.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: {
          type: "string",
          description: "UUID of the appointment to cancel",
        },
      },
      required: ["appointment_id"],
    },
    permissionMode: ask,
  },
  {
    name: "reschedule_appointment",
    description: "Reschedule an existing confirmed appointment to a new slot.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: {
          type: "string",
          description: "UUID of the appointment to reschedule",
        },
        new_slot_start: {
          type: "string",
          description: "New slot start time in ISO 8601",
        },
        new_slot_end: {
          type: "string",
          description: "New slot end time in ISO 8601",
        },
      },
      required: ["appointment_id", "new_slot_start", "new_slot_end"],
    },
    permissionMode: ask,
  },
];

/** OpenAI tools/list shape including `permission_mode`. */
export function toOpenAiToolsList() {
  return {
    tools: APPOINTMENT_TOOLS.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
      permission_mode: tool.permissionMode,
    })),
  };
}
