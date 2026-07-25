import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema } from "drizzle-zod";

export const customActivities = pgTable("custom_activities", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  estimatedCaloriesBurned: integer("estimated_calories_burned").default(0),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  note: text("note"),
});

export const insertCustomActivitySchema = createInsertSchema(customActivities).omit({ id: true, loggedAt: true });
export type InsertCustomActivity = typeof customActivities.$inferInsert;
export type CustomActivity = typeof customActivities.$inferSelect;
