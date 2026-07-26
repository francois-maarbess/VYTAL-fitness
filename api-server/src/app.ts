import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ verify: (req, _res, buf) => { (req as unknown as Record<string, unknown>).rawBody = buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));

const SKIP_AUTH = ["/api/healthz"];

app.use((req: Request, res: Response, next: NextFunction) => {
  const pubKey = process.env["CLERK_PUBLISHABLE_KEY"] || process.env["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"];
  if (!process.env["CLERK_SECRET_KEY"] || !pubKey) return next();
  if (SKIP_AUTH.some((p) => req.path.startsWith(p))) return next();
  clerkMiddleware()(req, res, next);
});

app.use("/api", router);

export default app;
