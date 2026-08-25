import { Router, type IRouter } from "express";
import { db } from "../../../lib/db/src/index.ts";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;
    res.json({ status: "ok", db: "connected", latencyMs });
  } catch (err) {
    res.status(503).json({ status: "error", db: "disconnected", error: (err as Error).message });
  }
});

export default router;
