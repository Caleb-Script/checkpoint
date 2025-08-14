-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allowReEntry" BOOLEAN NOT NULL DEFAULT true,
    "rotateSeconds" INTEGER NOT NULL DEFAULT 300,
    "maxSeats" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Seat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "section" TEXT,
    "table" TEXT,
    "number" TEXT,
    "note" TEXT,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Seat_eventId_idx" ON "public"."Seat"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "seat_unique_position_per_event" ON "public"."Seat"("eventId", "section", "table", "number");

-- AddForeignKey
ALTER TABLE "public"."Seat" ADD CONSTRAINT "Seat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
