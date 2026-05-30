import { Router, type Request, type Response } from "express";
  import bcrypt from "bcryptjs";
  import { User, LoginLog, nextId } from "@workspace/db";
  import { randomUUID } from "crypto";

  const router = Router();
  const COOKIE_NAME = "academy_session";
  const COOKIE_OPTS = {
    httpOnly: true, signed: true, sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  };

  function setSessionCookie(
    res: Response,
    user: { id: string; firstName: string | null; lastName: string | null; email: string; createdAt: number }
  ) {
    res.cookie(COOKIE_NAME, JSON.stringify(user), COOKIE_OPTS);
  }

  async function logEvent(
    req: Request,
    opts: { userId?: string; email: string; firstName?: string | null; action: "register" | "login" | "login_failed" | "register_failed" }
  ) {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress || null;
      const id = await nextId("loginLogs");
      await LoginLog.create({
        _id: id, userId: opts.userId ?? null, email: opts.email,
        firstName: opts.firstName ?? null, action: opts.action,
        ipAddress: ip, userAgent: req.headers["user-agent"] || null,
      });
    } catch { /* non-critical */ }
  }

  router.post("/auth/register", async (req: Request, res: Response) => {
    const { firstName, lastName, emailAddress, password } = req.body as Record<string, string>;
    if (!emailAddress || !password || !firstName) {
      res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة." });
      return;
    }
    const email = emailAddress.trim().toLowerCase();
    try {
      const existing = await User.findOne({ email }).lean();
      if (existing) {
        res.status(409).json({ error: "هذا البريد الإلكتروني مستخدم بالفعل. جرب تسجيل الدخول." });
        return;
      }
      const id = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const name = [firstName.trim(), lastName?.trim()].filter(Boolean).join(" ");
      const username = email.split("@")[0]!.replace(/[^a-zA-Z0-9_]/g, "_");
      await User.create({ _id: id, clerkId: id, name, username, email, passwordHash });
      const userData = {
        id, firstName: firstName.trim(), lastName: lastName?.trim() || null,
        email, createdAt: Date.now(),
      };
      setSessionCookie(res, userData);
      await logEvent(req, { userId: id, email, firstName: firstName.trim(), action: "register" });
      res.json({ success: true, user: userData });
    } catch (err: unknown) {
      req.log.error({ err }, "Failed to register user");
      await logEvent(req, { email, firstName, action: "register_failed" });
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مجدداً." });
    }
  });

  router.post("/auth/login", async (req: Request, res: Response) => {
    const { emailAddress, password } = req.body as Record<string, string>;
    if (!emailAddress || !password) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان." });
      return;
    }
    const email = emailAddress.trim().toLowerCase();
    try {
      const user = await User.findOne({ email }).lean() as any;
      if (!user || !user.passwordHash) {
        await logEvent(req, { email, action: "login_failed" });
        res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        return;
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        await logEvent(req, { email, action: "login_failed" });
        res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        return;
      }
      const nameParts = (user.name ?? "").split(" ");
      const fName = nameParts[0] ?? null;
      const lName = nameParts.slice(1).join(" ") || null;
      const userData = {
        id: user._id as string,
        firstName: fName,
        lastName: lName,
        email: user.email as string,
        createdAt: (user.createdAt instanceof Date ? user.createdAt.getTime() : Date.now()),
      };
      setSessionCookie(res, userData);
      await logEvent(req, { userId: user._id as string, email, firstName: fName, action: "login" });
      res.json({ success: true, user: userData });
    } catch (err: unknown) {
      req.log.error({ err }, "Failed to login");
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مجدداً." });
    }
  });

  router.get("/auth/me", async (req: Request, res: Response) => {
    const raw = (req as any).signedCookies?.[COOKIE_NAME];
    if (!raw) { res.status(401).json({ error: "غير مصادق." }); return; }
    try {
      const sessionUser = JSON.parse(raw) as { id: string; firstName: string | null; lastName: string | null; email: string; createdAt: number };
      const localUser = await User.findOne({ $or: [{ _id: sessionUser.id }, { clerkId: sessionUser.id }] }).lean() as any;
      if (!localUser) { res.status(401).json({ error: "المستخدم غير موجود." }); return; }
      res.json({
        user: {
          ...sessionUser,
          role: localUser.role ?? "user",
          fullName: localUser.name ?? null,
          firstName: sessionUser.firstName ?? null,
          lastName: sessionUser.lastName ?? null,
          username: localUser.username ?? sessionUser.email.split("@")[0],
          imageUrl: localUser.avatarUrl ?? "",
          publicMetadata: { bio: localUser.bio ?? null },
        },
      });
    } catch { res.status(401).json({ error: "جلسة غير صالحة." }); }
  });

  router.post("/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, signed: true, sameSite: "lax" });
    res.json({ success: true });
  });

  export default router;
  