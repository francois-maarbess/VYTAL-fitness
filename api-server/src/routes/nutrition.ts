import { Router } from "express";
import OpenAI from "openai";
import { db, dailyMetrics } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const USDA_API_KEY = process.env.USDA_API_KEY ?? "";

const EXTRACT_PROMPT = `You are a world-class nutritionist and food recognition AI. Parse the user's food description and return accurate nutritional estimates.

CRITICAL: Return ONLY valid JSON matching this exact schema:
{
  "isValidFood": boolean,
  "message": string,
  "items": [{ "food": string, "weight_g": number, "calories": number, "protein": number, "carbs": number, "fat": number }],
  "totalMacros": { "calories": number, "protein": number, "carbs": number, "fat": number }
}

Rules:
1. Recognize ALL foods including composite/cultural dishes (e.g., "fassoulya with rice", "butter chicken", "pho", "pad thai", "stew"). Break them down into ingredients.
2. Estimate weight in grams based on description:
   - Explicit weight (e.g., "200g steak") → use exactly 200
   - "2 kg of steak" → 2000
   - "a plate of" → ~400g total (typical dinner plate serving)
   - "a bowl of" → ~300g
   - "a cup of" → ~240g
   - No amount specified → assume standard serving (200g for main dish, 150g for sides)
3. Calculate accurate macros for EACH item using your knowledge of standard nutritional data:
   - Steak/beef: ~250-290 kcal, ~26g protein, ~15g fat per 100g cooked
   - Chicken breast: ~165 kcal, ~31g protein, ~3.6g fat per 100g cooked
   - White rice (cooked): ~130 kcal, ~2.7g protein, ~28g carbs per 100g
   - Pasta (cooked): ~131 kcal, ~5g protein, ~25g carbs per 100g
   - Olive oil: ~884 kcal, ~100g fat per 100g
   - Beans (cooked): ~130 kcal, ~9g protein, ~24g carbs per 100g
4. For composite dishes, estimate total macros by summing ingredients:
   - "plate of fassoulya with rice" → ~250g stew + ~200g rice = ~500-650 kcal, ~25g P, ~70g C, ~15g F
5. If the user says conversational text, non-food items, set isValidFood to false.
6. Set "message" to a brief description of what was recognized.
7. Set "totalMacros" to the sum of all items' macros — this is the authoritative macro total the app will display.`;

// Standard volume-to-gram conversions (approximate)
const VOLUME_TO_GRAMS: Record<string, number> = {
  "cup": 240, "cups": 240,
  "tbsp": 15, "tablespoon": 15, "tablespoons": 15,
  "tsp": 5, "teaspoon": 5, "teaspoons": 5,
  "ml": 1, "milliliter": 1, "milliliters": 1,
  "l": 1000, "liter": 1000, "liters": 1000,
  "fl oz": 30, "fluid ounce": 30, "fluid ounces": 30,
  "oz": 30,
};

function volumeToGrams(volume: string | null): number | null {
  if (!volume) return null;
  const lower = volume.toLowerCase().trim();
  for (const [unit, grams] of Object.entries(VOLUME_TO_GRAMS)) {
    const match = lower.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unit}$`));
    if (match) return parseFloat(match[1]) * grams;
  }
  return null;
}

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
} as const;

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: { nutrientId: number; value: number; unitName?: string }[];
}

interface MacrosPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

async function searchUSDA(query: string): Promise<{ name: string; macrosPer100g: MacrosPer100g } | null> {
  if (!USDA_API_KEY) return null;

  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", USDA_API_KEY);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", "1");
    url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");
    url.searchParams.set("requireAllWords", "true");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const body = await res.json() as { foods?: USDAFood[] };
    const food = body.foods?.[0];
    if (!food) return null;

    const nutrients = food.foodNutrients ?? [];
    const findNutrient = (id: number): number => {
      const n = nutrients.find(n => n.nutrientId === id);
      return n ? Math.round(Math.abs(n.value) * 10) / 10 : 0;
    };

    return {
      name: food.description,
      macrosPer100g: {
        calories: findNutrient(NUTRIENT_IDS.ENERGY),
        protein: findNutrient(NUTRIENT_IDS.PROTEIN),
        carbs: findNutrient(NUTRIENT_IDS.CARBS),
        fat: findNutrient(NUTRIENT_IDS.FAT),
      },
    };
  } catch {
    return null;
  }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

router.post("/analyze", async (req, res) => {
  const startTime = Date.now();

  try {
    const { text } = req.body as { text: string };
    if (!text?.trim()) {
      res.status(400).json({
        isValidFood: false, foodSummary: null, items: [],
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        message: "Please describe what you ate.",
      });
      return;
    }

    // Step 1: Groq food recognition + macro estimation
    const extraction = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: text.trim() },
      ],
      max_tokens: 800,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(extraction.choices[0]?.message?.content ?? "{}") as {
      isValidFood?: boolean;
      message?: string;
      items?: { food: string; weight_g: number; calories: number; protein: number; carbs: number; fat: number }[];
      totalMacros?: { calories: number; protein: number; carbs: number; fat: number };
    };

    if (!parsed.isValidFood || !parsed.items?.length) {
      res.json({
        isValidFood: false,
        foodSummary: null,
        items: [],
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        message: parsed.message ?? "I can only log food items. Please describe what you ate.",
      });
      return;
    }

    // Step 2: Use AI-estimated macros as primary, try USDA for refinement on single-ingredient items
    const lookedUpItems: {
      name: string;
      weightGrams: number;
      macros: { calories: number; protein: number; carbs: number; fat: number };
    }[] = [];

    for (const item of parsed.items) {
      const weightG = Math.max(item.weight_g ?? 100, 10);

      // Try USDA lookup for refinement (for single-ingredient foods)
      let macros = { calories: item.calories ?? 0, protein: item.protein ?? 0, carbs: item.carbs ?? 0, fat: item.fat ?? 0 };
      const usda = await searchUSDA(item.food);
      if (usda && macros.calories === 0) {
        const factor = weightG / 100;
        macros = {
          calories: Math.round(usda.macrosPer100g.calories * factor),
          protein: Math.round(usda.macrosPer100g.protein * factor),
          carbs: Math.round(usda.macrosPer100g.carbs * factor),
          fat: Math.round(usda.macrosPer100g.fat * factor),
        };
      }

      lookedUpItems.push({
        name: item.food,
        weightGrams: Math.round(weightG * 10) / 10,
        macros,
      });
    }

    // Step 3: Use AI totalMacros if available, otherwise sum items
    const totals = parsed.totalMacros && parsed.totalMacros.calories > 0
      ? parsed.totalMacros
      : lookedUpItems.reduce(
          (acc, item) => ({
            calories: acc.calories + item.macros.calories,
            protein: acc.protein + item.macros.protein,
            carbs: acc.carbs + item.macros.carbs,
            fat: acc.fat + item.macros.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

    // Step 4: Save to daily_metrics if user is authenticated
    const userId = (req as unknown as Record<string, unknown>).authUserId as string | undefined;
    const date = todayStr();

    if (userId) {
      try {
        const existing = await db
          .select()
          .from(dailyMetrics)
          .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, date)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(dailyMetrics)
            .set({
              calories: sql`${dailyMetrics.calories} + ${totals.calories}`,
              protein: sql`${dailyMetrics.protein} + ${totals.protein}`,
              carbs: sql`${dailyMetrics.carbs} + ${totals.carbs}`,
              fat: sql`${dailyMetrics.fat} + ${totals.fat}`,
              updatedAt: new Date(),
            })
            .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, date)));
        } else {
          await db.insert(dailyMetrics).values({
            userId,
            date,
            calories: totals.calories,
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
          });
        }
      } catch (dbErr) {
        req.log.warn({ err: dbErr }, "Failed to save nutrition to daily_metrics");
      }
    }

    const elapsed = Date.now() - startTime;
    req.log.info({ items: lookedUpItems.length, elapsed: `${elapsed}ms` }, "Nutrition analyzed");

    // Step 5: Return to client
    res.json({
      isValidFood: true,
      foodSummary: lookedUpItems.map(i => `${i.weightGrams}g ${i.name}`).join(", "),
      items: lookedUpItems.map(i => ({
        name: i.name,
        weightGrams: i.weightGrams,
        macros: i.macros,
      })),
      macros: totals,
      message: `Logged ${totals.calories} kcal (P${totals.protein}g C${totals.carbs}g F${totals.fat}g).`,
    });
  } catch (err) {
    req.log.error({ err }, "Nutrition analyze error");
    res.json({
      isValidFood: false,
      foodSummary: null,
      items: [],
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      message: "Nutrition server is currently unavailable. Please try again.",
    });
  }
});

export default router;
