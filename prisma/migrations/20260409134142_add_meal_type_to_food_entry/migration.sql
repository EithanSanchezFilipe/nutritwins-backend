/*
  Warnings:

  - You are about to drop the column `mealType` on the `daily_log` table. All the data in the column will be lost.
  - Added the required column `mealType` to the `food_entry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "daily_log" DROP COLUMN "mealType";

-- AlterTable
ALTER TABLE "food_entry" ADD COLUMN     "mealType" "MealType" NOT NULL;
