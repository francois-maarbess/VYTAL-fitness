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

const router = Router();

router.use("/healthz", healthRouter);
router.use("/webhooks", webhookRouter);
router.use("/nutrition", optionalAuth, nutritionRouter);
router.use("/coach", requireAuth(), coachRouter);
router.use("/achievements", optionalAuth, achievementsRouter);
router.use("/leaderboard", optionalAuth, leaderboardRouter);
router.use("/users", requireAuth(), usersRouter);
router.use("/exercises", optionalAuth, exercisesRouter);

export default router;
