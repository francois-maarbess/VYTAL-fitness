import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema } from "drizzle-zod";

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, unlockedAt: true });
export type InsertAchievement = typeof achievements.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
