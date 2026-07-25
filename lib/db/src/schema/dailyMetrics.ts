import { pgTable, serial, text, integer, numeric, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema } from "drizzle-zod";

export const dailyMetrics = pgTable("daily_metrics", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  calories: integer("calories").default(0),
  protein: integer("protein").default(0),
  carbs: integer("carbs").default(0),
  fat: integer("fat").default(0),
  sleepHours: numeric("sleep_hours", { precision: 4, scale: 1 }),
  sleepQuality: text("sleep_quality"),
  steps: integer("steps").default(0),
  readinessScore: integer("readiness_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex("daily_metrics_user_date_idx").on(table.userId, table.date),
}));

export const insertDailyMetricSchema = createInsertSchema(dailyMetrics).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyMetric = typeof dailyMetrics.$inferInsert;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
