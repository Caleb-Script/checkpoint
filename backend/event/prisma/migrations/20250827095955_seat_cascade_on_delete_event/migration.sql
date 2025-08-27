-- DropForeignKey
ALTER TABLE "public"."Seat" DROP CONSTRAINT "Seat_eventId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Seat" ADD CONSTRAINT "Seat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
