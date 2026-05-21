import { groqService } from "../../lib/groq";
import { FoodAnalysisResponse } from "./food-entry.schemas";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "openai/gpt-oss-120b";

export class FoodEntryService {
  async analyzeFood(input: {
    imageBuffer?: Buffer;
    mimeType?: string;
    textDescription?: string;
    language?: string;
  }): Promise<FoodAnalysisResponse> {
    const now = new Date();
    const requestedLang = (input.language ?? "en").toLowerCase();
    const responseLanguage =
      requestedLang === "fr"
        ? "French"
        : requestedLang === "es"
          ? "Spanish"
          : "English";
    const responseLanguageNative =
      requestedLang === "fr"
        ? "français"
        : requestedLang === "es"
          ? "español"
          : "English";
    const notFoodMessage =
      requestedLang === "fr"
        ? "L'entrée n'est pas un aliment ou une boisson."
        : requestedLang === "es"
          ? "La entrada no es un alimento o bebida."
          : "The entry is not a food or beverage.";
    const currentHour = now.getHours();
    const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const prompt = `You are an expert nutritionist specializing in world cuisines, including African, Asian, 
  Latin American, and Middle Eastern dishes, as well as all types of beverages.
  Respond in ${responseLanguage}. Use ${responseLanguageNative} for all string content in the JSON output.

  Step 1: Determine whether the input is food, a prepared dish, or a beverage 
  (juice, smoothie, soda, water, alcohol, cocktail, milk, tea, coffee, etc.).
  If it is NONE of these, return ONLY: {"isFood": false, "error": "${notFoodMessage}"}

  Step 2: Identify EVERY component with maximum specificity.

  CRITICAL RULES — FOOD:
  - NEVER use generic names like "sauce", "accompagnement", "garniture", "épices".
  - Always identify the EXACT sauce by its real culinary name:
    * "sauce graine" → décompose en: huile de palme, noix de palme, oignon, piment, poisson fumé, etc.
    * "sauce arachide" → décompose en: pâte d'arachide, tomate, oignon, huile, etc.
    * "sauce tomate" → tomate, oignon, huile, ail, etc.
    * "curry" → lait de coco, pâte de curry, oignon, etc.
    * Apply the same logic to ANY sauce, stew, or condiment.
  - Decompose composite dishes into ALL individual ingredients (base + sauce + protein + sides).
  - For West African dishes specifically: recognize fufu, attiéké, riz, banane plantain,
    aloko, sauce graine, sauce gombo, sauce arachide, sauce claire, kedjenou, etc.
  - Estimate realistic portion weights based on typical serving sizes.
  - Each ingredient must have its own accurate macros per quantity listed.

  CRITICAL RULES — BEVERAGES:
  - Identify the exact beverage type (e.g. "jus d'orange pressé", "Coca-Cola", "lait entier", 
    "café latte", "cocktail mojito", "bière blonde 5°", "eau gazeuse", etc.).
  - NEVER use generic names like "boisson" or "jus".
  - Decompose mixed drinks and smoothies into their individual components 
    (e.g. mojito → rhum blanc, citron vert, menthe fraîche, sucre de canne, eau gazeuse).
  - For beverages, use "ml" as the unit instead of "g".
  - Estimate realistic serving volumes (e.g. espresso 30ml, verre de jus 250ml, canette 330ml).
  - Include alcohol content in calories when relevant (1g alcool = 7 kcal).
  - Fiber is typically 0 for most drinks unless it is a whole-fruit smoothie or similar.

  Return this JSON structure:
  {
    "isFood": true,
    "dishName": string,        // exact culinary or beverage name
    "isBeverage": boolean,     // true if the input is a drink, false if it is food
    "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK", // Predict primarily from the dish itself. Examples: oatmeal/eggs/coffee/croissant → BREAKFAST; rice dish/sandwich/soup/attieke → LUNCH or DINNER; cake/fruit/biscuit/smoothie → SNACK. If the dish is ambiguous (e.g. riz, poulet, pâtes — could be LUNCH or DINNER), use the current time (${timeLabel}, hour=${currentHour}) as tiebreaker: before 15h → LUNCH, 15h+ → DINNER.
    "ingredients": [
      {
        "name": string,        // specific ingredient name, never generic
        "quantity": string,
        "unit": "g" | "ml",   // ml for beverages and liquid ingredients, g for solids
        "macros": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "fiber": number
        }
      }
    ],
    "macros": {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number},
    "estimatedWeight": string, // use "ml" for beverages (e.g. "330ml", "250ml")
    "confidence": "high" | "medium" | "low"
  }
`;

    const hasImage = !!input.imageBuffer;
    const opts = {
      model: hasImage ? VISION_MODEL : TEXT_MODEL,
      responseFormat: { type: "json_object" as const },
    };
    const extraText = input.textDescription
      ? `Description supplémentaire de l'utilisateur : ${input.textDescription}`
      : undefined;

    try {
      const textResponse = hasImage
        ? await groqService.completeWithImage(
            prompt,
            input.imageBuffer!,
            input.mimeType ?? "image/jpeg",
            opts,
            extraText,
          )
        : await groqService.complete(
            prompt + (extraText ? `\n\n${extraText}` : ""),
            opts,
          );

      const parsedData = JSON.parse(textResponse);

      if (parsedData.isFood === false) {
        const foodError = new Error(
          parsedData.error || "L'entrée n'est pas un aliment.",
        );
        (foodError as any).statusCode = 422;
        throw foodError;
      }

      const calculatedMacros = (parsedData.ingredients || []).reduce(
        (acc: any, ing: any) => ({
          calories: acc.calories + (Number(ing.macros?.calories) || 0),
          protein: acc.protein + (Number(ing.macros?.protein) || 0),
          carbs: acc.carbs + (Number(ing.macros?.carbs) || 0),
          fat: acc.fat + (Number(ing.macros?.fat) || 0),
          fiber: acc.fiber + (Number(ing.macros?.fiber) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      );

      return {
        ...parsedData,
        macros: {
          calories: Math.round(calculatedMacros.calories),
          protein: Math.round(calculatedMacros.protein * 10) / 10,
          carbs: Math.round(calculatedMacros.carbs * 10) / 10,
          fat: Math.round(calculatedMacros.fat * 10) / 10,
          fiber: Math.round(calculatedMacros.fiber * 10) / 10,
        },
      } as FoodAnalysisResponse;
    } catch (error: any) {
      if (error.statusCode || error.status === 429) {
        if (error.status === 429) (error as any).statusCode = 429;
        throw error;
      }

      console.error("Erreur d'analyse Groq:", error);
      throw new Error("Échec de l'analyse nutritionnelle via Groq.");
    }
  }
}
