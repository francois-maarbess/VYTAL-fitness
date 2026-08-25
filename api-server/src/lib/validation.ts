import { z } from "zod";

// ── Coach chat ────────────────────────────────────────────────────────────────
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000).trim(),
});

const UserProfileSchema = z
  .object({
    name: z.string().max(100).optional(),
    age: z.number().int().min(10).max(120).optional(),
    weight: z.number().min(20).max(400).optional(),
    height: z.number().min(100).max(250).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    goals: z.array(z.string().max(50)).max(10).optional(),
    injuries: z.array(z.string().max(50)).max(10).optional(),
    equipment: z.array(z.string().max(50)).max(10).optional(),
    activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
    streak: z.number().int().min(0).max(10000).optional(),
    totalWorkouts: z.number().int().min(0).max(100000).optional(),
    caloriesConsumed: z.number().min(0).max(50000).optional(),
    protein: z.number().min(0).max(5000).optional(),
    carbs: z.number().min(0).max(5000).optional(),
    fat: z.number().min(0).max(5000).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    sleepQuality: z.enum(["poor", "fair", "good", "excellent", "not rated"]).optional(),
    stepsToday: z.number().int().min(0).max(200000).optional(),
    readinessScore: z.number().int().min(0).max(100).optional(),
    tdee: z.number().int().min(0).max(10000).optional(),
    bmr: z.number().int().min(0).max(10000).optional(),
  })
  .passthrough();

export const CoachChatSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  userProfile: UserProfileSchema.optional(),
  workoutIntent: z
    .object({
      sport: z.string().max(50).optional(),
      goal: z.string().max(50).optional(),
    })
    .optional(),
  todayWorkout: z.record(z.unknown()).optional(),
});

// ── Coach generate-plan ───────────────────────────────────────────────────────
export const GeneratePlanSchema = z.object({
  profile: z.record(z.unknown()).refine((obj) => Object.keys(obj).length > 0, {
    message: "profile must not be empty",
  }),
});

// ── Coach workouts-by-category ────────────────────────────────────────────────
const VALID_CATEGORIES = [
  "Bodybuilding", "Calisthenics", "Basketball", "Football",
  "Tennis", "Cardio", "Mobility", "Strength", "Sports",
] as const;

export const WorkoutsByCategorySchema = z.object({
  category: z.string().refine((c) => VALID_CATEGORIES.some((v) => v.toLowerCase() === c.toLowerCase()), {
    message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
  }),
  goals: z.string().max(200).optional(),
  equipment: z.string().max(200).optional(),
  injuries: z.string().max(200).optional(),
});

// ── Nutrition analyze ─────────────────────────────────────────────────────────
export const NutritionAnalyzeSchema = z.object({
  text: z.string().min(1).max(500).trim(),
});

// ── Write-back command sanitization ───────────────────────────────────────────
// These limits prevent the AI from injecting extreme values via embedded commands
const WRITE_BACK_LIMITS = {
  SET_SLEEP: { min: 0, max: 24 },
  SET_STEPS: { min: 0, max: 100000, integer: true },
  ADD_CALORIES: { min: 0, max: 10000, integer: true },
  ADD_PROTEIN: { min: 0, max: 2000, integer: true },
  ADD_CARBS: { min: 0, max: 2000, integer: true },
  ADD_FAT: { min: 0, max: 2000, integer: true },
} as const;

const WRITE_BACK_PATTERN = /\[(RESET_MACROS|SET_SLEEP:[\d.]+|SET_STEPS:\d+|ADD_CALORIES:\d+|ADD_PROTEIN:\d+|ADD_CARBS:\d+|ADD_FAT:\d+)\]/g;

/**
 * Sanitize AI response content: validate and clamp write-back command values,
 * then strip the commands from the visible text.
 */
export function sanitizeAIResponse(content: string): { cleanText: string; commands: string[] } {
  const commands: string[] = [];
  const cleanText = content.replace(WRITE_BACK_PATTERN, (match) => {
    const colonIdx = match.indexOf(":");
    if (colonIdx === -1) {
      commands.push(match);
      return "";
    }
    const cmd = match.slice(1, colonIdx); // e.g. "SET_SLEEP"
    const rawValue = match.slice(colonIdx + 1, -1); // e.g. "7.5"
    const limits = WRITE_BACK_LIMITS[cmd as keyof typeof WRITE_BACK_LIMITS];
    if (!limits) return "";

    let value = parseFloat(rawValue);
    if (isNaN(value)) return "";
    if (limits.integer) value = Math.round(value);
    value = Math.max(limits.min, Math.min(limits.max, value));

    commands.push(`[${cmd}:${value}]`);
    return "";
  });

  return { cleanText: cleanText.trim(), commands };
}
