ALTER TABLE "appointment"."appointments" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointment"."connectors" ADD COLUMN "reminder_window_minutes" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
CREATE INDEX "appointment_appointments_reminder_pending_idx" ON "appointment"."appointments" USING btree ("status","reminder_sent_at","start_time");