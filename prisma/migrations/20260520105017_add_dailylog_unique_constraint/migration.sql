/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `daily_log` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "daily_log_userId_date_key" ON "daily_log"("userId", "date");
