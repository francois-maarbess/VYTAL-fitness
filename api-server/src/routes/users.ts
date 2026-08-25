import { Router } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, users, type InsertUser } from "../../../lib/db/src/index.ts";

const router = Router();

router.get("/profile", async (req, res) => {
  const authId = getAuth(req).userId;
  if (!authId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, authId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch user profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.put("/profile", async (req, res) => {
  const authId = getAuth(req).userId;
  if (!authId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { profile, state } = req.body as {
    profile?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };

  try {
    const values: InsertUser = {
      id: authId,
      email: "",
      updatedAt: new Date(),
      lastSyncedAt: new Date(),
    };

    if (profile) {
      if (typeof profile.name === "string") values.name = profile.name;
      if (typeof profile.age === "number") values.age = profile.age;
      if (typeof profile.weight === "number") values.weight = profile.weight;
      if (typeof profile.height === "number") values.height = profile.height;
      if (profile.gender === "male" || profile.gender === "female" || profile.gender === "other") values.gender = profile.gender;
      if (Array.isArray(profile.goals)) values.goals = profile.goals as string[];
      if (Array.isArray(profile.injuries)) values.injuries = profile.injuries as string[];
      if (Array.isArray(profile.equipment)) values.equipment = profile.equipment as string[];
      if (typeof profile.stressLevel === "number") values.stressLevel = profile.stressLevel;
      if (profile.activityLevel === "sedentary" || profile.activityLevel === "light" || profile.activityLevel === "moderate" || profile.activityLevel === "active" || profile.activityLevel === "very_active") values.activityLevel = profile.activityLevel;
      if (profile.onboardingComplete !== undefined) values.onboardingComplete = profile.onboardingComplete ? 1 : 0;
      if (typeof profile.email === "string") values.email = profile.email;
    }

    if (state) {
      if (typeof state.fitScore === "number") values.fitScore = state.fitScore;
      if (typeof state.streak === "number") values.streak = state.streak;
      if (typeof state.totalWorkouts === "number") values.totalWorkouts = state.totalWorkouts;
      if (typeof state.xp === "number") values.xp = state.xp;
      if (typeof state.level === "number") values.level = state.level;
    }

    const [user] = await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.id,
        set: values,
      })
      .returning();

    req.log.info({ authId }, "User profile synced");
    res.json({ user });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert user profile");
    res.status(500).json({ error: "Failed to save profile" });
  }
});

export default router;
