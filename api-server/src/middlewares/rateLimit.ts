import { rateLimit } from "express-rate-limit";
import { type Request } from "express";
import { getAuth } from "@clerk/express";

function userOrIpKey(req: Request): string {
  try {
    const auth = getAuth(req);
    if (auth?.userId) return `user:${auth.userId}`;
  } catch {
    // Auth middleware hasn't run yet — fall back to IP
  }
  return `ip:${req.ip}`;
}

function ipKey(req: Request): string {
  return `ip:${req.ip}`;
}

const RATE_LIMIT_EXCEEDED = { error: "Too many requests. Please wait a moment before trying again." };

// ── Coach chat: most expensive (2× Groq 70B calls per request) ──
export const coachChatLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: RATE_LIMIT_EXCEEDED,
});

// ── Coach plan generation: 1× Groq 70B call ──
export const coachPlanLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: RATE_LIMIT_EXCEEDED,
});

// ── Nutrition analysis: Groq + USDA ──
export const nutritionLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: RATE_LIMIT_EXCEEDED,
});

// ── Webhook abuse prevention (Clerk sends these, not users) ──
export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: RATE_LIMIT_EXCEEDED,
});

// ── General cheap routes (exercises, leaderboard, achievements, users) ──
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: "Too many requests. Please slow down." },
});
