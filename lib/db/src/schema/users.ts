import { doublePrecision, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const activityLevelEnum = pgEnum("activity_level", ["sedentary", "light", "moderate", "active", "very_active"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  // Full onboarding profile
  age: integer("age"),
  weight: doublePrecision("weight"),
  height: doublePrecision("height"),
  gender: genderEnum("gender"),
  goals: jsonb("goals").$type<string[]>().default([]),
  injuries: jsonb("injuries").$type<string[]>().default([]),
  equipment: jsonb("equipment").$type<string[]>().default([]),
  stressLevel: integer("stress_level"),
  activityLevel: activityLevelEnum("activity_level"),
  onboardingComplete: integer("onboarding_complete").default(0), // 0/1 boolean
  // Gamification state
  fitScore: integer("fit_score").default(0),
  streak: integer("streak").default(0),
  totalWorkouts: integer("total_workouts").default(0),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true, lastSyncedAt: true });
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
