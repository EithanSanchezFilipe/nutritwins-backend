/*
  Warnings:

  - Added the required column `mealType` to the `daily_log` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- AlterTable
ALTER TABLE "daily_log" ADD COLUMN     "mealType" "MealType" NOT NULL;
