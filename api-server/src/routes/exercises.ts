import { Router } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, exercises, insertExerciseSchema } from "@workspace/db";

const router = Router();

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

router.get("/", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const muscle = typeof req.query.muscle === "string" ? req.query.muscle.trim() : "";
    const sport = typeof req.query.sport === "string" ? req.query.sport.trim() : "";
    const limitParam = Number(req.query.limit ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : DEFAULT_LIMIT;

    const filters = [
      category ? eq(exercises.category, category as typeof exercises.$inferSelect.category) : undefined,
      muscle ? ilike(exercises.targetMuscle, `%${muscle}%`) : undefined,
      sport ? ilike(exercises.sport, `%${sport}%`) : undefined,
      q
        ? or(
            ilike(exercises.name, `%${q}%`),
            ilike(exercises.targetMuscle, `%${q}%`),
            ilike(exercises.equipment, `%${q}%`),
            ilike(exercises.sport, `%${q}%`),
            sql`${exercises.primaryMuscles}::text ilike ${`%${q}%`}`,
            sql`${exercises.secondaryMuscles}::text ilike ${`%${q}%`}`,
          )
        : undefined,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(exercises)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(exercises.source), exercises.name)
      .limit(limit);

    res.json({ exercises: rows });
  } catch (err) {
    req.log.error({ err }, "Exercise search error");
    res.status(500).json({ error: "Failed to search exercises" });
  }
});

router.post("/custom", async (req, res) => {
  try {
    const parsed = insertExerciseSchema.parse({
      ...req.body,
      source: "manual",
      category: "Custom",
      externalId: `custom-${Date.now()}`,
      targetMuscle: req.body?.targetMuscle ?? "Full Body",
      equipment: req.body?.equipment ?? "User Defined",
      primaryMuscles: req.body?.primaryMuscles ?? ["full body"],
      instructions: req.body?.instructions ?? ["Custom user-logged activity."],
      estimatedCaloriesPerMinute: req.body?.estimatedCaloriesPerMinute ?? 5,
    });

    const [row] = await db.insert(exercises).values(parsed).returning();
    res.status(201).json({ exercise: row });
  } catch (err) {
    req.log.error({ err }, "Custom exercise create error");
    res.status(400).json({ error: "Invalid custom exercise" });
  }
});

export default router;
