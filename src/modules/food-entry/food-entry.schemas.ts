import { z } from "zod";
export type {
  MealType,
  Macros,
  Ingredient,
  FoodAnalysisResponse,
  SaveFoodEntryInput,
} from "../../types/food.interfaces";

export const MealTypeEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

export const FoodAnalysisResponseSchema = z.object({
  isFood: z.boolean(),
  dishName: z.string().optional(),
  isBeverage: z.boolean().optional(),
  mealType: MealTypeEnum.optional(),
  error: z.string().optional(),

  ingredients: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string(),
        unit: z.string().optional(),
        macros: z.object({
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          fiber: z.number().optional(),
        }),
      }),
    )
    .optional(),

  macros: z
    .object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      fiber: z.number().optional(),
    })
    .optional(),

  estimatedWeight: z.string().optional(),
  confidence: z.string().optional(),
});

export const FoodAnalysisTextBody = z.object({
  description: z.string().min(3),
});

export const SaveFoodEntryBody = z.object({
  mealType: MealTypeEnum,
  dishName: z.string().optional(),
  macros: z
    .object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      fiber: z.number().optional(),
    })
    .optional(),
});
