import { PrismaClient } from "../../generated/prisma/client";
import { getTodayRange } from "./daily-logs.utils";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export class DailyLogsService {
  constructor(private prisma: PrismaClient) {}

  async getTodayLog(userId: string, timezoneOffset?: number) {
    const { start } = getTodayRange(timezoneOffset);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { targetCal: true },
    });

    if (!user?.targetCal) {
      throw new Error("TARGET_CAL_NOT_SET");
    }

    return this.prisma.dailyLog.upsert({
      where: {
        userId_date: {
          userId,
          date: start,
        },
      },
      update: {},
      create: {
        userId,
        date: start,
        targetCalories: user.targetCal,
      },
      include: { entries: true },
    });
  }

  async getUserLogs(userId: string) {
    return this.prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });
  }

  async getById(userId: string, dailyLogId: string) {
    return this.prisma.dailyLog.findFirst({
      where: {
        id: dailyLogId,
        userId,
      },
      include: {
        entries: true,
      },
    });
  }

  async addFoodEntry(
    userId: string,
    entry: {
      mealType: MealType;
      dishName: string;
      macros: { calories: number; protein: number; carbs: number; fat: number };
    },
    timezoneOffset?: number,
  ) {
    const dailyLog = await this.getTodayLog(userId, timezoneOffset);

    const foodEntry = await this.prisma.foodEntry.create({
      data: {
        dailyLogId: dailyLog.id,
        description: entry.dishName,
        mealType: entry.mealType,
        calories: Math.round(entry.macros.calories),
        protein: entry.macros.protein,
        carbs: entry.macros.carbs,
        fat: entry.macros.fat,
      },
    });

    await this.prisma.dailyLog.update({
      where: { id: dailyLog.id },
      data: {
        consumedCalories: {
          increment: Math.round(entry.macros.calories),
        },
      },
    });

    return foodEntry;
  }
}
