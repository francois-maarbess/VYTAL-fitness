import { Router } from "express";

const router = Router();

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  thresholds: { bronze: number; silver: number; gold: number };
}

interface PreviouslyUnlocked {
  id: string;
  tier: "bronze" | "silver" | "gold";
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first-workout", name: "First Step", description: "Complete your first workout", icon: "star-outline", iconColor: "#FFD700", thresholds: { bronze: 1, silver: 10, gold: 50 } },
  { id: "week-streak", name: "7-Day Warrior", description: "Maintain a 7-day streak", icon: "flame-outline", iconColor: "#FF6B35", thresholds: { bronze: 3, silver: 7, gold: 30 } },
  { id: "century", name: "Centurion", description: "Complete 100 workouts", icon: "trophy-outline", iconColor: "#C0C0C0", thresholds: { bronze: 25, silver: 50, gold: 100 } },
  { id: "iron", name: "Iron Will", description: "30-day streak", icon: "shield-outline", iconColor: "#7C3AED", thresholds: { bronze: 7, silver: 14, gold: 30 } },
  { id: "nutrition-week", name: "Fuel Master", description: "Log meals for 7 days straight", icon: "restaurant-outline", iconColor: "#00C4FF", thresholds: { bronze: 1, silver: 3, gold: 7 } },
  { id: "early-bird", name: "Early Bird", description: "Complete 10 morning workouts", icon: "sunny-outline", iconColor: "#FFB800", thresholds: { bronze: 3, silver: 5, gold: 10 } },
  { id: "level-5", name: "Level Up", description: "Reach Level 5", icon: "ribbon-outline", iconColor: "#00D4FF", thresholds: { bronze: 2, silver: 3, gold: 5 } },
  { id: "longevity", name: "Longevity Mode", description: "Use the app for 30 days", icon: "heart-outline", iconColor: "#FF4D4D", thresholds: { bronze: 7, silver: 14, gold: 30 } },
];

function computeTier(value: number, t: { bronze: number; silver: number; gold: number }): { tier: "gold" | "silver" | "bronze" | null; progress: number; total: number } {
  if (value >= t.gold) return { tier: "gold", progress: t.gold, total: t.gold };
  if (value >= t.silver) return { tier: "silver", progress: value, total: t.gold };
  if (value >= t.bronze) return { tier: "bronze", progress: value, total: t.gold };
  return { tier: null, progress: value, total: t.gold };
}

router.post("/evaluate", (req, res) => {
  const body = req.body || {};
  const totalWorkouts = typeof body.totalWorkouts === "number" ? body.totalWorkouts : 0;
  const streak = typeof body.streak === "number" ? body.streak : 0;
  const level = typeof body.level === "number" ? body.level : 1;
  const nutritionLogDays = typeof body.nutritionLogDays === "number" ? body.nutritionLogDays : 0;
  const morningWorkouts = typeof body.morningWorkouts === "number" ? body.morningWorkouts : 0;
  const appDays = typeof body.appDays === "number" ? body.appDays : 0;
  const previouslyUnlocked: PreviouslyUnlocked[] = Array.isArray(body.previouslyUnlocked) ? body.previouslyUnlocked : [];

  const valueMap: Record<string, number> = {
    "first-workout": totalWorkouts,
    "week-streak": streak,
    "century": totalWorkouts,
    "iron": streak,
    "nutrition-week": nutritionLogDays,
    "early-bird": morningWorkouts,
    "level-5": level,
    "longevity": appDays,
  };

  const prevMap = new Map(previouslyUnlocked.map(a => [a.id, a.tier]));
  const newlyUnlocked: AchievementDef[] = [];

  const all = ACHIEVEMENT_DEFS.map(def => {
    const value = valueMap[def.id] ?? 0;
    const { tier, progress, total } = computeTier(value, def.thresholds);
    const prevTier = prevMap.get(def.id) ?? null;

    const tierOrder: Array<"bronze" | "silver" | "gold"> = ["bronze", "silver", "gold"];
    const prevIdx = prevTier ? tierOrder.indexOf(prevTier) : -1;
    const currIdx = tier ? tierOrder.indexOf(tier) : -1;

    if (tier && currIdx > prevIdx) {
      newlyUnlocked.push(def);
    }

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      iconColor: def.iconColor,
      tier,
      unlocked: tier !== null,
      progress,
      total,
    };
  });

  res.json({ all, newlyUnlocked });
});

export default router;
