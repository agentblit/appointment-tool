ALTER TABLE "appointment"."connectors" ADD COLUMN "user_id" varchar(255);--> statement-breakpoint
DELETE FROM "appointment"."connectors" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "appointment"."connectors" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "appointment_connectors_user_id_idx" ON "appointment"."connectors" USING btree ("user_id");
