ALTER TABLE "EDL_tmp" ALTER COLUMN "Net_Amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Net_Amount_Str" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_history" ADD COLUMN "Net_Amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "Unit_Price";--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "Total_Amount";--> statement-breakpoint
ALTER TABLE "EDL_history" DROP COLUMN "Total_Amount";