import { Router } from "express";
import OpenAI from "openai";
import { coachChatLimiter, coachPlanLimiter } from "../middlewares/rateLimit";
import {
  CoachChatSchema,
  GeneratePlanSchema,
  WorkoutsByCategorySchema,
  sanitizeAIResponse,
} from "../lib/validation";

const router = Router();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const OFF_TOPIC_RESPONSE = "I am a performance coach, not a search engine. Let's get back to your training.";

const SYSTEM_PROMPT = `You are VYTAL ai, an elite, no-nonsense performance coach embedded in the VYTAL Fitness app.
You coach training, health, recovery, nutrition, mobility, longevity, and sport performance only.

NON-NEGOTIABLE RULES:
1. Never write more than 2-3 short sentences unless returning a workout plan.
2. Never answer non-fitness or non-health questions. For coding, weather, history, trivia, general search, finance, politics, or entertainment, reply exactly: "${OFF_TOPIC_RESPONSE}"
3. Tone: direct, motivating, highly professional. No rambling, no therapy-speak, no fluff.
4. No emojis. No markdown. No asterisks. No bold or italic formatting. Return clean plain text only.
5. Prioritise safety. For pain, injury, illness, or medical risk, advise conservative training and professional care.
6. When the user's message requires changing today's workout, trigger the modify_todays_workout tool. Use it for injury-aware swaps, sport-specific additions, deleting unsafe movements, equipment constraints, or time-driven changes.

WRITE-BACK COMMANDS - embed these invisibly in your response when the user's message implies a state change:
- To reset the user's macro/calorie log to zero: include [RESET_MACROS]
- To set their sleep hours: include [SET_SLEEP:7.5] (replace with actual hours)
- To set their step count: include [SET_STEPS:8000] (replace with actual steps)
- To add calories consumed: include [ADD_CALORIES:500]
- To add protein grams: include [ADD_PROTEIN:40]
- To add carbs grams: include [ADD_CARBS:60]
- To add fat grams: include [ADD_FAT:15]

For compound commands, execute resets first, then additions.
If intent is ambiguous, do the safer action and ask for confirmation in one short sentence.`;

const EXERCISE_CATEGORIES = [
  "Bodybuilding",
  "Calisthenics",
  "Basketball",
  "Football",
  "Tennis",
  "Cardio",
  "Mobility",
  "Strength",
  "Sports",
] as const;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Bodybuilding: "Hypertrophy, machines, dumbbells, barbells, cables, isolation and compound lifts",
  Calisthenics: "Bodyweight strength, pull-ups, push-ups, dips, handstands, core control",
  Basketball: "Court conditioning, jumps, lateral speed, defensive slides, acceleration, deceleration",
  Football: "Power, sprint mechanics, agility, contact preparation, posterior chain, change of direction",
  Tennis: "Rotational power, shoulder resilience, lateral movement, repeated sprint conditioning",
  Cardio: "Running, cycling, rowing, jump rope, HIIT, stair climber, swimming laps, elliptical",
  Mobility: "Yoga, pilates, stretching, foam rolling, dynamic warm-ups, flexibility drills, balance work",
  Strength: "Weightlifting, resistance training, powerlifting, heavy compounds, progressive overload",
  Sports: "Basketball, football, soccer, tennis, boxing, martial arts, volleyball, baseball, golf, rugby, hockey",
};

const PLAN_KEYWORDS = [
  "weekly plan",
  "workout plan",
  "make me a plan",
  "create a plan",
  "schedule for the week",
  "plan for the week",
  "training plan",
  "program for me",
  "write me a plan",
  "generate a plan",
  "build me a plan",
  ...EXERCISE_CATEGORIES.flatMap((c) => [
    `${c.toLowerCase()} workout`,
    `${c.toLowerCase()} routine`,
    `${c.toLowerCase()} training`,
  ]),
];

const WORKOUT_MODIFICATION_TOOL = {
  type: "function",
  function: {
    name: "modify_todays_workout",
    description: "Modify today's workout plan in the app by adding, swapping, or deleting an exercise.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: {
          type: "string",
          enum: ["add", "swap", "delete"],
          description: "The mutation to apply to today's workout.",
        },
        exercise_name: {
          type: "string",
          description: "The existing exercise to swap or delete. Omit for add when no existing exercise is targeted.",
        },
        replacement_name: {
          type: "string",
          description: "The exercise to add or the replacement exercise for a swap.",
        },
        reason: {
          type: "string",
          description: "Short professional reason for the mutation.",
        },
      },
      required: ["action"],
    },
  },
} as const;

const FITNESS_KEYWORDS = [
  "workout",
  "training",
  "train",
  "exercise",
  "lift",
  "lifting",
  "strength",
  "muscle",
  "hypertrophy",
  "cardio",
  "run",
  "running",
  "walk",
  "walking",
  "cycling",
  "mobility",
  "stretch",
  "recovery",
  "nutrition",
  "protein",
  "calorie",
  "macro",
  "meal",
  "diet",
  "sleep",
  "steps",
  "readiness",
  "injury",
  "pain",
  "shoulder",
  "knee",
  "back",
  "basketball",
  "football",
  "tennis",
  "sport",
  "plan",
  "program",
  "sets",
  "reps",
  "rest",
  "fat loss",
  "weight",
  "health",
  "longevity",
];

const OFF_TOPIC_KEYWORDS = [
  "president",
  "stock",
  "crypto",
  "movie",
  "song",
  "news",
  "search",
];

function wantsPlan(messages: { role: string; content: string }[]): boolean {
  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
  return PLAN_KEYWORDS.some((kw) => last.includes(kw));
}

function isOffTopic(messages: { role: string; content: string }[]): boolean {
  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
  if (!last.trim()) return false;
  const hardBlocked = [
    "code",
    "coding",
    "programming",
    "javascript",
    "typescript",
    "react",
    "python",
    "weather",
    "history",
  ].some((kw) => last.includes(kw));
  if (hardBlocked) return true;
  const hasFitnessIntent = FITNESS_KEYWORDS.some((kw) => last.includes(kw));
  const hasOffTopicIntent = OFF_TOPIC_KEYWORDS.some((kw) => last.includes(kw));
  return hasOffTopicIntent && !hasFitnessIntent;
}

function cleanJson(content: string): string {
  return content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

type WorkoutModification = {
  action: "add" | "swap" | "delete";
  exerciseName?: string;
  replacementName?: string;
  reason?: string;
};

type ToolArguments = {
  action?: string;
  exercise_name?: string;
  replacement_name?: string;
  reason?: string;
};

function parseWorkoutModification(argumentsJson: string): WorkoutModification | null {
  try {
    const args = JSON.parse(argumentsJson) as ToolArguments;
    if (args.action !== "add" && args.action !== "swap" && args.action !== "delete") return null;
    return {
      action: args.action,
      exerciseName: typeof args.exercise_name === "string" ? args.exercise_name : undefined,
      replacementName: typeof args.replacement_name === "string" ? args.replacement_name : undefined,
      reason: typeof args.reason === "string" ? args.reason : undefined,
    };
  } catch {
    return null;
  }
}

async function detectWorkoutModification({
  messages,
  userProfile,
  workoutIntent,
  todayWorkout,
}: {
  messages: { role: string; content: string }[];
  userProfile?: Record<string, unknown>;
  workoutIntent?: Record<string, unknown>;
  todayWorkout?: Record<string, unknown>;
}): Promise<WorkoutModification | null> {
  const lastMessage = messages[messages.length - 1]?.content ?? "";
  if (!lastMessage.trim()) return null;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are VYTAL ai's workout mutation controller.
Decide whether the user's latest message requires changing today's workout.
Call modify_todays_workout only when the user asks or clearly implies today's plan should change because of injury, pain, sport context, equipment limits, time limits, fatigue, or a specific exercise preference.
For shoulder pain from tennis, prefer safe rotator cuff/scapular work such as Resistance Band External Rotations, Face Pulls, Scapular Wall Slides, or Cable External Rotations.
Do not call the tool for nutrition, sleep, general advice, weekly plan generation, or off-topic messages.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          latestMessage: lastMessage,
          workoutIntent,
          todayWorkout,
          userProfile: userProfile
            ? {
                goals: userProfile.goals,
                injuries: userProfile.injuries,
                equipment: userProfile.equipment,
                readinessScore: userProfile.readinessScore,
              }
            : undefined,
        }),
      },
    ],
    tools: [WORKOUT_MODIFICATION_TOOL],
    tool_choice: "auto",
    max_tokens: 120,
    temperature: 0,
  });

  const toolCalls = response.choices[0]?.message?.tool_calls ?? [];
  const call = toolCalls.find((toolCall) => toolCall.function?.name === "modify_todays_workout");
  return call?.function?.arguments ? parseWorkoutModification(call.function.arguments) : null;
}

function profileContext(userProfile?: Record<string, unknown>) {
  if (!userProfile) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}

User Profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age ?? "unknown"}
- Weight: ${userProfile.weight ?? "unknown"}kg
- Height: ${userProfile.height ?? "unknown"}cm
- Gender: ${userProfile.gender ?? "unknown"}
- Goals: ${Array.isArray(userProfile.goals) ? userProfile.goals.join(", ") : ""}
- Injuries: ${Array.isArray(userProfile.injuries) && userProfile.injuries.length ? userProfile.injuries.join(", ") : "None"}
- Equipment: ${Array.isArray(userProfile.equipment) ? userProfile.equipment.join(", ") : ""}
- Activity level: ${userProfile.activityLevel ?? "moderate"}
- Current streak: ${userProfile.streak ?? 0} days
- Total workouts completed: ${userProfile.totalWorkouts ?? 0}

Live Daily State:
- Calories consumed today: ${userProfile.caloriesConsumed ?? 0}
- Protein today: ${userProfile.protein ?? 0}g
- Carbs today: ${userProfile.carbs ?? 0}g
- Fat today: ${userProfile.fat ?? 0}g
- Sleep hours last night: ${userProfile.sleepHours ?? 0}
- Sleep quality: ${userProfile.sleepQuality ?? "not rated"}
- Steps today: ${userProfile.stepsToday ?? 0}
- Readiness score: ${userProfile.readinessScore ?? 0}/100
- TDEE: ${userProfile.tdee ?? 0} kcal
- BMR: ${userProfile.bmr ?? 0} kcal`;
}

router.post("/chat", coachChatLimiter, async (req, res) => {
  try {
    const parsed = CoachChatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { messages, userProfile, workoutIntent, todayWorkout } = parsed.data;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    if (isOffTopic(messages)) {
      res.write(`data: ${JSON.stringify({ type: "text", content: OFF_TOPIC_RESPONSE })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const askedForPlan = wantsPlan(messages);
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: profileContext(userProfile) },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      stream: true,
      max_tokens: askedForPlan ? 500 : 120,
      temperature: 0.25,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) res.write(`data: ${JSON.stringify({ type: "text", content })}\n\n`);
    }

    try {
      const modification = await detectWorkoutModification({ messages, userProfile, workoutIntent, todayWorkout });
      if (modification) {
        res.write(`data: ${JSON.stringify({ type: "workout_modification", modification })}\n\n`);
      }
    } catch (err) {
      req.log.warn({ err }, "Workout modification tool pass failed");
    }

    if (askedForPlan) {
      const goals = Array.isArray(userProfile?.goals) ? userProfile.goals.join(", ") : "general fitness";
      const equipment = Array.isArray(userProfile?.equipment) ? userProfile.equipment.join(", ") : "full gym";
      const injuries = Array.isArray(userProfile?.injuries) && (userProfile.injuries as string[]).length
        ? (userProfile.injuries as string[]).join(", ")
        : "none";

      const last = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
      const userCategory = EXERCISE_CATEGORIES.find((c) => last.includes(c.toLowerCase()));
      const categoryFocus = userCategory
        ? `The user specifically asked about ${userCategory}. Build the plan around that category.`
        : "Mix Bodybuilding, Calisthenics, Cardio, Mobility, and sport-specific work across the week.";

      const planRes = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an elite performance coach. The app has these exercise categories:
${EXERCISE_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_DESCRIPTIONS[c]}`).join("\n")}

Return ONLY valid JSON with no markdown, no code blocks, no extra text.`,
          },
          {
            role: "user",
            content: `Create a 7-day workout schedule for someone with goals: ${goals}, equipment: ${equipment}, injuries: ${injuries}.
${categoryFocus}
Each day must include a "category" and "type" field matching one of: ${EXERCISE_CATEGORIES.join(", ")}.
Use "Recovery" as category/type for rest days.

Return this exact JSON structure:
{
  "Monday": { "id": "mon", "name": "Push Day", "type": "Bodybuilding", "category": "Bodybuilding", "duration": 50, "difficulty": "Intermediate", "muscleGroups": ["Chest", "Shoulders"], "calories": 380, "exercises": [{ "name": "Bench Press", "sets": 4, "reps": "8-10", "rest": 90, "muscleGroup": "Chest" }] },
  "Tuesday": { ... },
  "Wednesday": { "id": "wed", "name": "Recovery", "type": "Recovery", "category": "Recovery", "duration": 0, "difficulty": "Beginner", "muscleGroups": [], "calories": 0, "exercises": [] },
  "Thursday": { ... },
  "Friday": { ... },
  "Saturday": { ... },
  "Sunday": { "id": "sun", "name": "Recovery", "type": "Recovery", "category": "Recovery", "duration": 0, "difficulty": "Beginner", "muscleGroups": [], "calories": 0, "exercises": [] }
}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      try {
        const plan = JSON.parse(cleanJson(planRes.choices[0]?.message?.content ?? ""));
        res.write(`data: ${JSON.stringify({ type: "workout_plan", plan })}\n\n`);
      } catch {
        req.log.warn("Workout plan JSON parsing failed");
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    req.log.error({ err }, "Coach chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service unavailable" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "text", content: "Connection issue. Retry in a moment." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

router.post("/generate-plan", coachPlanLimiter, async (req, res) => {
  try {
    const parsed = GeneratePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { profile } = parsed.data;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are an expert performance coach. Generate a 7-day personalized workout and nutrition plan. Return ONLY valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `Create a plan for: ${JSON.stringify(profile)}.
Return JSON: {"weeklyPlan":[{"day":"Monday","workoutType":"Push","exercises":[{"name":"Bench Press","sets":4,"reps":"8-10","rest":90}],"targetCalories":2200,"macros":{"protein":180,"carbs":220,"fats":70}}],"summary":"Brief personalized summary"}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    res.json(JSON.parse(cleanJson(response.choices[0]?.message?.content ?? "")));
  } catch (err) {
    req.log.error({ err }, "Generate plan error");
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

router.post("/workouts-by-category", coachPlanLimiter, async (req, res) => {
  try {
    const parsed = WorkoutsByCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors.category?.[0] ?? "Invalid request" });
      return;
    }
    const { category, goals, equipment, injuries } = parsed.data;

    const normalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const matched = EXERCISE_CATEGORIES.find((c) => c.toLowerCase() === normalized.toLowerCase());
    if (!matched) {
      res.status(400).json({ error: `Invalid category. Must be one of: ${EXERCISE_CATEGORIES.join(", ")}` });
      return;
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an elite performance coach. The app has these exercise categories:
${EXERCISE_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_DESCRIPTIONS[c]}`).join("\n")}

Return ONLY valid JSON with no markdown, no code blocks, no extra text.`,
        },
        {
          role: "user",
          content: `Generate a "${matched}" workout for someone with goals: ${goals ?? "general fitness"}, equipment: ${equipment ?? "full gym"}, injuries: ${injuries ?? "none"}.

Return this exact JSON structure:
{
  "id": "cat-wod-1",
  "name": "Basketball Conditioning",
  "type": "${matched}",
  "category": "${matched}",
  "duration": 45,
  "difficulty": "Intermediate",
  "muscleGroups": ["Legs", "Core"],
  "calories": 400,
  "exercises": [
    { "name": "Squat Jumps", "sets": 4, "reps": "12", "rest": 60, "muscleGroup": "Legs" }
  ]
}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    res.json(JSON.parse(cleanJson(response.choices[0]?.message?.content ?? "")));
  } catch (err) {
    req.log.error({ err }, "Workouts by category error");
    res.status(500).json({ error: "Failed to generate workout" });
  }
});

export default router;
