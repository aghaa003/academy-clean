import { Router, type Request, type Response } from "express";
import { LoginLog, LessonComment, LessonLike, Lesson, Course, User, CommunityPost, CommunityPostComment, Review, toDoc, toDocs } from "@workspace/db";

const router = Router();

function getSessionUser(req: any): { id: string } | null {
  const raw = req.signedCookies?.["academy_session"];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function requireAdmin(req: Request, res: Response): Promise<any | null> {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return null; }
  const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
  if (!lu || lu.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return null; }
  return lu;
}

async function getLoginLogs(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await LoginLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs: toDocs(logs), total: logs.length });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
}

router.get("/admin/login-logs", getLoginLogs);
router.get("/admin/logs", getLoginLogs);

router.get("/admin/engagement", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const [comments, likes] = await Promise.all([
      LessonComment.find().sort({ createdAt: -1 }).limit(limit).lean() as Promise<any[]>,
      LessonLike.find().sort({ createdAt: -1 }).limit(limit).lean() as Promise<any[]>,
    ]);

    const enrichedComments = await Promise.all(
      comments.map(async (c: any) => {
        const [u, lesson] = await Promise.all([
          User.findById(c.userId).lean() as Promise<any>,
          c.lessonId ? (await import("@workspace/db")).Lesson.findById(c.lessonId).lean() as Promise<any> : null,
        ]);
        const course = lesson ? await Course.findById(lesson?.courseId).lean() as any : null;
        return {
          id: String(c._id),
          userName: u?.name ?? "User",
          lessonTitle: lesson?.title ?? "درس",
          courseTitle: course?.title ?? "كورس",
          type: "comment" as const,
          content: c.content,
          createdAt: c.createdAt,
        };
      })
    );

    const enrichedLikes = await Promise.all(
      likes.map(async (l: any) => {
        const [u, lesson] = await Promise.all([
          User.findById(l.userId).lean() as Promise<any>,
          l.lessonId ? (await import("@workspace/db")).Lesson.findById(l.lessonId).lean() as Promise<any> : null,
        ]);
        const course = lesson ? await Course.findById(lesson?.courseId).lean() as any : null;
        return {
          id: String(l._id),
          userName: u?.name ?? "User",
          lessonTitle: lesson?.title ?? "درس",
          courseTitle: course?.title ?? "كورس",
          type: "like" as const,
          createdAt: l.createdAt,
        };
      })
    );

    const all = [...enrichedComments, ...enrichedLikes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ items: all, engagements: all, total: all.length });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/engagements", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const [comments, likes] = await Promise.all([
      LessonComment.find().sort({ createdAt: -1 }).limit(limit).lean() as Promise<any[]>,
      LessonLike.find().sort({ createdAt: -1 }).limit(limit).lean() as Promise<any[]>,
    ]);
    const enrichedComments = await Promise.all(
      comments.map(async (c: any) => {
        const [u, lesson] = await Promise.all([
          User.findById(c.userId).lean() as Promise<any>,
          c.lessonId ? Lesson.findById(c.lessonId).lean() as Promise<any> : null,
        ]);
        const course = lesson ? await Course.findById(lesson?.courseId).lean() as any : null;
        return {
          id: String(c._id), userName: u?.name ?? "User",
          lessonTitle: lesson?.title ?? "درس", courseTitle: course?.title ?? "كورس",
          type: "comment" as const, content: c.content, createdAt: c.createdAt,
        };
      })
    );
    const enrichedLikes = await Promise.all(
      likes.map(async (l: any) => {
        const [u, lesson] = await Promise.all([
          User.findById(l.userId).lean() as Promise<any>,
          l.lessonId ? Lesson.findById(l.lessonId).lean() as Promise<any> : null,
        ]);
        const course = lesson ? await Course.findById(lesson?.courseId).lean() as any : null;
        return {
          id: String(l._id), userName: u?.name ?? "User",
          lessonTitle: lesson?.title ?? "درس", courseTitle: course?.title ?? "كورس",
          type: "like" as const, createdAt: l.createdAt,
        };
      })
    );
    const all = [...enrichedComments, ...enrichedLikes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ engagements: all, items: all, total: all.length });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/community-moderation", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const comments = await CommunityPostComment.find().sort({ createdAt: -1 }).limit(limit).lean() as any[];
    const enriched = await Promise.all(
      comments.map(async (c: any) => {
        const [u, post] = await Promise.all([
          User.findById(c.userId).lean() as Promise<any>,
          CommunityPost.findById(c.postId).lean() as Promise<any>,
        ]);
        return {
          id: String(c._id),
          userName: u?.name ?? "User",
          postTitle: post?.title ?? "مشاركة",
          content: c.content,
          createdAt: c.createdAt,
          postId: c.postId,
        };
      })
    );
    res.json({ comments: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/comments", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const comments = await LessonComment.find().sort({ createdAt: -1 }).limit(limit).lean() as any[];
    const enriched = await Promise.all(
      comments.map(async (c: any) => {
        const [u, lesson] = await Promise.all([
          User.findById(c.userId).lean() as Promise<any>,
          c.lessonId ? Lesson.findById(c.lessonId).lean() as Promise<any> : null,
        ]);
        const course = lesson ? await Course.findById(lesson?.courseId).lean() as any : null;
        return {
          id: String(c._id),
          userName: u?.name ?? "User",
          lessonTitle: lesson?.title ?? "درس",
          courseTitle: course?.title ?? "كورس",
          content: c.content,
          status: "published" as const,
          createdAt: c.createdAt,
        };
      })
    );
    res.json({ comments: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/comments/:commentId", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const id = Number(req.params.commentId);
    const deleted = await LessonComment.findByIdAndDelete(id).lean();
    if (!deleted) { res.status(404).json({ error: "Comment not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/community-comments/:commentId", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const id = Number(req.params.commentId);
    const comment = await CommunityPostComment.findById(id).lean() as any;
    if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
    await CommunityPostComment.findByIdAndDelete(id);
    await CommunityPost.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Reviews Moderation ───────────────────────────────────────────────────────
router.get("/admin/reviews", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const allReviews = await Review.find().sort({ createdAt: -1 }).limit(limit).lean() as any[];
    const enriched = await Promise.all(
      allReviews.map(async (r: any) => {
        const [user, course] = await Promise.all([
          User.findById(r.userId).lean() as Promise<any>,
          r.courseId ? (await import("@workspace/db")).Course.findById(r.courseId).lean() as Promise<any> : null,
        ]);
        const isHome = r.courseId === 0;
        return {
          id: String(r._id),
          userName: isHome ? (r.reviewerName ?? "زائر") : (user?.name ?? "مستخدم"),
          userAvatar: user?.avatarUrl ?? null,
          courseTitle: isHome ? "آراء الصفحة الرئيسية" : (course?.title ?? "كورس"),
          rating: r.rating,
          comment: r.comment ?? "",
          reviewerName: r.reviewerName ?? "",
          isHomeReview: isHome,
          status: r.status ?? "approved",
          createdAt: r.createdAt,
        };
      })
    );
    res.json({ reviews: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/reviews/:reviewId/approve", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const id = Number(req.params.reviewId);
    const updated = await Review.findByIdAndUpdate(id, { status: "approved" }, { new: true }).lean();
    if (!updated) { res.status(404).json({ error: "Review not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/reviews/:reviewId/reject", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const id = Number(req.params.reviewId);
    const updated = await Review.findByIdAndUpdate(id, { status: "rejected" }, { new: true }).lean();
    if (!updated) { res.status(404).json({ error: "Review not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── User Ban / Unban ─────────────────────────────────────────────────────────
router.post("/admin/users/:userId/ban", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { userId } = req.params;
    const updated = await User.findByIdAndUpdate(userId, { banned: true }, { new: true }).lean() as any;
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true, banned: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users/:userId/unban", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { userId } = req.params;
    const updated = await User.findByIdAndUpdate(userId, { banned: false }, { new: true }).lean() as any;
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true, banned: false });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
