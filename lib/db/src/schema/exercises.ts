import { index, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "Bodybuilding",
  "Calisthenics",
  "Basketball",
  "Football",
  "Tennis",
  "Cardio",
  "Mobility",
  "Recovery",
  "Strength",
  "Sports",
  "Custom",
]);

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  externalId: text("external_id"),
  source: text("source").notNull().default("manual"),
  name: text("name").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  force: text("force"),
  level: text("level"),
  mechanic: text("mechanic"),
  equipment: text("equipment").notNull().default("Bodyweight"),
  primaryMuscles: text("primary_muscles").array().notNull().default([]),
  secondaryMuscles: text("secondary_muscles").array().notNull().default([]),
  targetMuscle: text("target_muscle").notNull().default("Full Body"),
  sport: text("sport"),
  instructions: text("instructions").array().notNull().default([]),
  imageUrls: text("image_urls").array().notNull().default([]),
  estimatedCaloriesPerMinute: real("estimated_calories_per_minute").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sourceExternalIdx: uniqueIndex("exercises_source_external_id_idx").on(table.source, table.externalId),
  nameIdx: uniqueIndex("exercises_name_source_idx").on(table.name, table.source),
  categoryIdx: index("exercises_category_idx").on(table.category),
  muscleIdx: index("exercises_muscle_idx").on(table.targetMuscle),
  sportIdx: index("exercises_sport_idx").on(table.sport),
  equipmentIdx: index("exercises_equipment_idx").on(table.equipment),
}));

export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true, createdAt: true, updatedAt: true });
export const selectExerciseSchema = createSelectSchema(exercises);
export type InsertExercise = typeof exercises.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
