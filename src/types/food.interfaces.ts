export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit?: string;
  macros: Macros;
}

export interface FoodAnalysisResponse {
  isFood: boolean;
  dishName?: string;
  isBeverage?: boolean;
  mealType?: MealType;
  error?: string;
  ingredients?: Ingredient[];
  macros?: Macros;
  estimatedWeight?: string;
  confidence?: string;
}

export interface SaveFoodEntryInput extends FoodAnalysisResponse {
  mealType: MealType;
}
