import { type Request, type RequestHandler } from "express";

  export const CLERK_PROXY_PATH = "/__clerk_proxy";

  export function clerkProxyMiddleware(): RequestHandler {
    return (_req, _res, next) => next();
  }

  export function getClerkProxyHost(req: Request): string | null {
    return (req.headers["x-forwarded-host"] as string) ?? null;
  }
  