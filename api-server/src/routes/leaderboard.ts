import { Router } from "express";

const router = Router();

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  fitScore: number;
  streak: number;
  isCurrentUser: boolean;
  rankDelta: number;
}

const MOCK_USERS: { userId: string; name: string; fitScore: number; streak: number; prevRank: number }[] = [
  { userId: "user_mock_1", name: "Sarah Chen", fitScore: 8750, streak: 89, prevRank: 2 },
  { userId: "user_mock_2", name: "Marcus Rivera", fitScore: 8120, streak: 64, prevRank: 1 },
  { userId: "user_mock_3", name: "Yuki Tanaka", fitScore: 7890, streak: 52, prevRank: 4 },
  { userId: "user_mock_4", name: "Priya Sharma", fitScore: 7540, streak: 47, prevRank: 3 },
  { userId: "user_mock_5", name: "Alex Johnson", fitScore: 7210, streak: 38, prevRank: 5 },
  { userId: "user_mock_6", name: "Emma Wilson", fitScore: 6980, streak: 31, prevRank: 6 },
  { userId: "user_mock_7", name: "James Park", fitScore: 6650, streak: 25, prevRank: 9 },
  { userId: "user_mock_8", name: "Sofia Garcia", fitScore: 6320, streak: 19, prevRank: 7 },
  { userId: "user_mock_9", name: "Liam O'Brien", fitScore: 6100, streak: 14, prevRank: 10 },
  { userId: "user_mock_10", name: "Olivia Brown", fitScore: 5890, streak: 11, prevRank: 8 },
];

router.get("/", (req, res) => {
  const currentUserId = (req as unknown as Record<string, unknown>).authUserId as string | undefined;
  const userName = (req.query.userName as string) || "You";
  const userFitScore = parseInt(req.query.fitScore as string, 10) || 0;
  const userStreak = parseInt(req.query.streak as string, 10) || 0;
  const userRank = parseInt(req.query.userRank as string, 10) || 0;
  const prevUserRank = parseInt(req.query.prevUserRank as string, 10) || 0;

  const entries: LeaderboardEntry[] = MOCK_USERS.map((u, i) => ({
    rank: i + 1,
    userId: u.userId,
    name: u.name,
    avatar: u.name.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2),
    fitScore: u.fitScore,
    streak: u.streak,
    isCurrentUser: false,
    rankDelta: u.prevRank - (i + 1),
  }));

  if (userFitScore > 0) {
    const insertAt = entries.findIndex(e => userFitScore > e.fitScore);
    const rank = insertAt >= 0 ? insertAt + 1 : entries.length + 1;
    const delta = prevUserRank > 0 ? prevUserRank - rank : 0;

    entries.splice(insertAt >= 0 ? insertAt : entries.length, 0, {
      rank,
      userId: currentUserId || "current_user",
      name: userName,
      avatar: userName.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2),
      fitScore: userFitScore,
      streak: userStreak,
      isCurrentUser: true,
      rankDelta: delta,
    });

    entries.forEach((e, i) => { e.rank = i + 1; });
  }

  res.json({
    entries: entries.slice(0, 10),
    generatedAt: new Date().toISOString(),
  });
});

export default router;
