import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema } from "drizzle-zod";

export const leaderboardCache = pgTable("leaderboard_cache", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  rank: integer("rank"),
  period: text("period").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userPeriodIdx: uniqueIndex("leaderboard_user_period_idx").on(table.userId, table.period),
}));

export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardCache).omit({ id: true, updatedAt: true });
export type InsertLeaderboardEntry = typeof leaderboardCache.$inferInsert;
export type LeaderboardEntry = typeof leaderboardCache.$inferSelect;
