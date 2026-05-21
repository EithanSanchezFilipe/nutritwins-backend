import { PrismaClient } from "../../generated/prisma/client";

import { Gender, ActivityLevel, Goal } from "../../types/dbSchema";
import { MetricsBody } from "../metrics/metrics.interfaces";
import MetricsServices from "../metrics/metrics.service";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  LOSE_WEIGHT: -400,
  GAIN_MUSCLE: 300,
  MAINTAIN: 0,
};

const MIN_SAFE_CALORIES = 1200;

interface CalorieInput {
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export class CaloriesService {
  constructor(private prisma: PrismaClient) {}
  metricsService = new MetricsServices(this.prisma);

  calculateMetabolism(data: CalorieInput) {
    const { gender, age, height, weight, activityLevel, goal } = data;

    let bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr = gender === Gender.MALE ? bmr + 5 : bmr - 161;

    const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2);
    const targetCalories = tdee + (GOAL_ADJUSTMENTS[goal] || 0);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCal: Math.round(Math.max(targetCalories, MIN_SAFE_CALORIES)),
    };
  }

  async calculateAndUpdateUser(
    userId: string,
    input: CalorieInput & { birthDate: Date },
  ) {
    const stats = this.calculateMetabolism(input);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        gender: input.gender,
        height: input.height,
        weight: input.weight,
        activityLevel: input.activityLevel,
        goal: input.goal,
        birthDate: input.birthDate,
        bmr: stats.bmr,
        tdee: stats.tdee,
        targetCal: stats.targetCal,
      },
    });
    const metrics: MetricsBody = { height: input.height, weight: input.weight };
    this.metricsService.createMetric(metrics, userId);

    return {
      ...stats,
    };
  }
}
