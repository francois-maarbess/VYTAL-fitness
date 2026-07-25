import { requireAuth, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export { requireAuth, getAuth };

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (auth?.userId) {
    (req as unknown as Record<string, unknown>).authUserId = auth.userId;
  }
  next();
}
