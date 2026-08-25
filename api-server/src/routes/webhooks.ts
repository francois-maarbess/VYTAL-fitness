import { Router } from "express";
import { Webhook } from "svix";
import { db, users } from "../../../lib/db/src/index.ts";
import { eq } from "drizzle-orm";
import { webhookLimiter } from "../middlewares/rateLimit";

const router = Router();

router.post("/clerk", webhookLimiter, async (req, res) => {
  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;
  const rawBody = (req as unknown as Record<string, unknown>).rawBody as string;

  if (!rawBody) {
    res.status(400).json({ error: "Raw body required" });
    return;
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    req.log.error("CLERK_WEBHOOK_SECRET not set");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const { type, data } = evt;

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const clerkId = data.id as string;
        const email = (data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address ?? "";
        const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null;
        const imageUrl = (data.image_url as string) || null;

        await db
          .insert(users)
          .values({ id: clerkId, email, name, imageUrl })
          .onConflictDoUpdate({
            target: users.id,
            set: { email, name, imageUrl, updatedAt: new Date(), lastSyncedAt: new Date() },
          });

        req.log.info({ clerkId }, "User synced from Clerk webhook");
        break;
      }

      case "user.deleted": {
        const clerkId = data.id as string;
        await db.delete(users).where(eq(users.id, clerkId));
        req.log.info({ clerkId }, "User deleted from Clerk webhook");
        break;
      }

      default:
        req.log.debug({ type }, "Unhandled Clerk webhook event");
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err, type }, "Webhook handler error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
