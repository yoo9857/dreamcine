-- CreateEnum
CREATE TYPE "DmPolicy" AS ENUM ('EVERYONE', 'FOLLOWERS', 'NOBODY');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "dm_policy" "DmPolicy" NOT NULL DEFAULT 'EVERYONE';

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" VARCHAR(120) NOT NULL DEFAULT '',
    "last_sender_id" TEXT,
    "initiator_unread" INTEGER NOT NULL DEFAULT 0,
    "recipient_unread" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_initiator_id_last_message_at_idx" ON "conversation"("initiator_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_recipient_id_last_message_at_idx" ON "conversation"("recipient_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_initiator_id_recipient_id_key" ON "conversation"("initiator_id", "recipient_id");

-- CreateIndex
CREATE INDEX "direct_message_conversation_id_created_at_id_idx" ON "direct_message"("conversation_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

