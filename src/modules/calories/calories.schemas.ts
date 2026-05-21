import { z } from "zod";
import { Gender, ActivityLevel, Goal } from "../../types/dbSchema";

export const CalculateCaloriesSchema = z.object({
  gender: z.nativeEnum(Gender),
  // This ensures the inferred type is strictly 'Date'
  birthDate: z.coerce.date(),
  height: z.number().min(50),
  weight: z.number().min(20),
  activityLevel: z.nativeEnum(ActivityLevel),
  goal: z.nativeEnum(Goal),
});
