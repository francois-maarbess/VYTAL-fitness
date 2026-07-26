import { requireAuth as clerkRequireAuth, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export { getAuth };

function clerkKey(): string | undefined {
  return process.env["CLERK_PUBLISHABLE_KEY"] || process.env["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"];
}

function hasClerkKeys(): boolean {
  return !!(process.env["CLERK_SECRET_KEY"] && clerkKey());
}

export function requireAuth(): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!hasClerkKeys()) {
      res.status(401).json({ error: "Authentication not configured" });
      return;
    }
    clerkRequireAuth()(req, res, next);
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!hasClerkKeys()) {
    next();
    return;
  }
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      (req as unknown as Record<string, unknown>).authUserId = auth.userId;
    }
  } catch {
    // Auth not available – proceed as unauthenticated
  }
  next();
}
