import { PrismaClient } from "../../generated/prisma/client";
import { groqService } from "../../lib/groq";
import { getTodayRange } from "../daily-logs/daily-logs.utils";

const RECIPES_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const HEALTHY_MEAL_FLOOR = 300; // kcal minimum for a nutritionally adequate meal

const EXCLUDED_OVERUSED_DISHES = [
  "jollof rice", "pad thai", "hummus", "tacos", "paella",
  "shakshuka", "fried rice", "nasi goreng", "falafel", "guacamole",
  "couscous", "pho", "sushi", "pasta carbonara", "quesadilla",
];

const REGION_ROTATION: Record<string, string[]> = {
  "West African": ["Ghanaian", "Nigerian", "Senegalese", "Ivorian", "Cameroonian", "Sierra Leonean", "Malian"],
  "North African or Middle Eastern": ["Moroccan", "Tunisian", "Lebanese", "Persian", "Syrian", "Egyptian", "Yemeni"],
  "Asian (East or South-East)": ["Vietnamese", "Thai", "Filipino", "Malaysian", "Indonesian", "Korean", "Burmese", "Cambodian"],
  "European or Mediterranean": ["Greek", "Turkish", "Portuguese", "Italian", "French", "Spanish", "Croatian"],
  "Latin American or Caribbean": ["Peruvian", "Colombian", "Jamaican", "Brazilian", "Cuban", "Ecuadorian", "Trinidadian"],
};

export class RecipesService {
  constructor(private prisma: PrismaClient) {}

  async getSuggestions(userId: string, mealType?: string, timezoneOffset?: number, language?: string) {
    const requestedLang = (language ?? "en").toLowerCase();
    const responseLanguage =
      requestedLang === "fr" ? "French" : requestedLang === "es" ? "Spanish" : "English";
    const responseLanguageNative =
      requestedLang === "fr" ? "français" : requestedLang === "es" ? "español" : "English";
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { allergies: true },
    });

    const { start, end } = getTodayRange(timezoneOffset);
    const todayLog = await this.prisma.dailyLog.findFirst({
      where: { userId, date: { gte: start, lte: end } },
      include: { entries: true },
    });

    const consumedCalories = todayLog?.consumedCalories ?? 0;
    const targetCalories = todayLog?.targetCalories ?? user.targetCal ?? 2000;
    const remainingCalories = targetCalories - consumedCalories;

    const eatenMealTypes = todayLog
      ? [...new Set(todayLog.entries.map((e) => e.mealType))]
      : [];

    const allergyNames = user.allergies.map((a) => a.name);

    // Meal progression: once a later meal is eaten, earlier ones are no longer relevant
    const MEAL_ORDER: Record<string, number> = {
      BREAKFAST: 1,
      LUNCH: 2,
      DINNER: 3,
    };
    const highestMealEaten = eatenMealTypes.reduce((max, m) => {
      return (MEAL_ORDER[m] ?? 0) > (MEAL_ORDER[max] ?? 0) ? m : max;
    }, "");
    const highestOrder = MEAL_ORDER[highestMealEaten] ?? 0;

    // Available = meals not yet eaten AND not before the highest eaten meal
    const ALL_MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
    const availableMealTypes = ALL_MEAL_TYPES.filter((m) => {
      if (eatenMealTypes.includes(m as any)) return false;
      if (m === "SNACK") return true; // SNACK always available unless already eaten
      return (MEAL_ORDER[m] ?? 0) > highestOrder;
    });

    const belowHealthyFloor = remainingCalories < HEALTHY_MEAL_FLOOR;
    const mealTypeInstruction = mealType
      ? `The user specifically wants recipes for: ${mealType}. All 5 suggestions must be for this meal type.`
      : availableMealTypes.length > 0
        ? `Only suggest recipes for these meal types: ${availableMealTypes.join(", ")}. DO NOT suggest anything for: ${ALL_MEAL_TYPES.filter((m) => !availableMealTypes.includes(m)).join(", ") || "none"}.`
        : `All meals have been eaten today. Suggest light SNACK options only.`;
    const calorieInstruction = belowHealthyFloor
      ? `The user has only ${remainingCalories} kcal remaining, which is below the healthy meal minimum of ${HEALTHY_MEAL_FLOOR} kcal. IGNORE the remaining calorie cap and suggest light but nutritionally balanced recipes anyway. Add a "warning" field in the response root explaining the user is near or over their daily target.`
      : `Each recipe must have a total calorie count that fits within the remaining ${remainingCalories} kcal.`;

    // Randomly pick a specific country style per region on each request
    const regionInstructions = Object.entries(REGION_ROTATION)
      .map(([region, countries]) => {
        const pick = countries[Math.floor(Math.random() * countries.length)];
        return `- ${region}: must be specifically a ${pick} dish`;
      })
      .join("\n");

    const prompt = `
You are a professional nutritionist and chef. Suggest 5 healthy recipes tailored to the user's profile and current daily intake.
Respond in ${responseLanguage}. Use ${responseLanguageNative} for all string content in the JSON response. Keep the JSON keys exactly as shown and do not translate the mealType field values.
Variation token (use this to explore different dishes each time): ${Math.random().toString(36).slice(2, 10)}-${Date.now() % 9999}

User profile:
- Goal: ${user.goal ?? "maintain"}
- Remaining calories for today: ${remainingCalories} kcal (target: ${targetCalories}, consumed: ${consumedCalories})
- Allergies/intolerances: ${allergyNames.length > 0 ? allergyNames.join(", ") : "none"}
- Meals already eaten today: ${eatenMealTypes.length > 0 ? eatenMealTypes.join(", ") : "none yet"}

Rules:
- NEVER suggest a recipe that contains any of the user's allergens.
- ${calorieInstruction}
- ${mealTypeInstruction}
- If remaining calories are very low (< 200) and above the healthy floor, suggest only light snacks.
- DIVERSITY IS MANDATORY: each suggestion must come from a DIFFERENT cuisine region, using the specific country style assigned below:
${regionInstructions}
- BANNED DISHES — never suggest any of these overused recipes: ${EXCLUDED_OVERUSED_DISHES.join(", ")}. Choose lesser-known, authentic dishes instead.
- Strongly prefer home-cooking staples, street food, or regional specialties that are NOT internationally famous. Avoid "greatest hits" dishes.

Return ONLY valid JSON in this structure:
{
  "warning": string | null,
  "suggestions": [
    {
      "title": string,
      "cuisine": string,
      "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
      "estimatedCalories": number,
      "ingredients": [{ "name": string, "quantity": string, "unit": string }],
      "instructions": string,
      "macros": { "calories": number, "protein": number, "carbs": number, "fat": number }
    }
  ]
}`;

    const raw = await groqService.complete(prompt, {
      model: RECIPES_MODEL,
      temperature: 1.2,
      responseFormat: { type: "json_object" },
    });

    const parsed = JSON.parse(raw);

    // Server-side safety filter: remove any suggestion the AI returned for a wrong meal type
    const allowedTypes = mealType
      ? [mealType]
      : availableMealTypes.length > 0
        ? availableMealTypes
        : ["SNACK"];
    const suggestions = (parsed.suggestions ?? []).filter((s: any) =>
      allowedTypes.includes(s.mealType),
    );

    return {
      remainingCalories,
      consumedCalories,
      targetCalories,
      belowHealthyFloor,
      warning: parsed.warning ?? null,
      eatenMealTypes,
      availableMealTypes,
      suggestions,
    };
  }
}