import { Router } from "express";
import healthRouter from "./health";
import coachRouter from "./coach";
import nutritionRouter from "./nutrition";
import webhookRouter from "./webhooks";
import achievementsRouter from "./achievements";
import leaderboardRouter from "./leaderboard";
import usersRouter from "./users";
import exercisesRouter from "./exercises";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { generalLimiter, nutritionLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use("/healthz", healthRouter);
router.use("/webhooks", webhookRouter);
router.use("/nutrition", optionalAuth, nutritionLimiter);
router.use("/coach", requireAuth(), coachRouter);
router.use("/achievements", generalLimiter, optionalAuth, achievementsRouter);
router.use("/leaderboard", generalLimiter, optionalAuth, leaderboardRouter);
router.use("/users", generalLimiter, requireAuth(), usersRouter);
router.use("/exercises", generalLimiter, optionalAuth, exercisesRouter);

export default router;
