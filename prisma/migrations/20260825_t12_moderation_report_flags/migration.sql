ALTER TABLE "report"
ADD COLUMN "priority_flag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "auto_hidden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "report_status_priority_flag_created_at_idx"
ON "report"("status", "priority_flag", "created_at");
