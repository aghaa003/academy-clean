import { Router } from "express";
import {
  LessonProgress, LessonComment, LessonLike,
  User, Course, Lesson, Notification, nextId, toDoc, toDocs,
} from "@workspace/db";

const router = Router();

function getUser(req: any): { id: string } | null {
  const raw = req.signedCookies?.["academy_session"];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function createNotification(opts: {
  userId: string; fromUserId: string; fromUserName: string;
  type: string; entityId?: number; entityTitle?: string; message: string;
}) {
  try {
    if (opts.userId === opts.fromUserId) return;
    const existing = await Notification.findOne({
      userId: opts.userId, fromUserId: opts.fromUserId,
      type: opts.type, entityId: opts.entityId ?? null,
    }).lean();
    if (existing) return;
    const id = await nextId("notifications");
    await Notification.create({
      _id: id, ...opts,
      entityId: opts.entityId ?? null,
      entityTitle: opts.entityTitle ?? "",
    });
  } catch { /* non-critical */ }
}

router.get("/lessons/:lessonId/progress", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const lessonId = Number(req.params.lessonId);
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.json({ completed: false, watchedSeconds: 0 }); return; }
    const p = await LessonProgress.findOne({ lessonId, userId: lu._id }).lean() as any;
    res.json({ completed: p?.completed ?? false, watchedSeconds: p?.watchedSeconds ?? 0 });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lessons/:lessonId/progress", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const lessonId = Number(req.params.lessonId);
    const { completed, watchedSeconds, courseId } = req.body as any;
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const existing = await LessonProgress.findOne({ lessonId, userId: lu._id }).lean() as any;
    if (existing) {
      await LessonProgress.findByIdAndUpdate(existing._id, {
        completed: completed ?? existing.completed,
        watchedSeconds: watchedSeconds ?? existing.watchedSeconds,
        updatedAt: new Date(),
      });
    } else {
      await LessonProgress.create({
        _id: await nextId("lessonProgress"),
        lessonId, courseId: courseId ?? 0, userId: lu._id,
        completed: completed ?? false,
        watchedSeconds: watchedSeconds ?? 0,
      });
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/progress", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.json([]); return; }
  try {
    const courseId = Number(req.params.courseId);
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.json([]); return; }
    res.json(toDocs(await LessonProgress.find({ courseId, userId: lu._id }).lean()));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/viewers", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const courseId = Number(req.params.courseId);
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const course = await Course.findById(courseId).lean() as any;
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (lu.role !== "admin" && course.creatorId !== String(lu._id)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const agg = await LessonProgress.aggregate([
      { $match: { courseId } },
      {
        $group: {
          _id: "$userId",
          totalLessons: { $sum: 1 },
          completedLessons: { $sum: { $cond: ["$completed", 1, 0] } },
          watchedSeconds: { $sum: "$watchedSeconds" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
      { $sort: { lastUpdated: -1 } },
    ]);
    const enriched = await Promise.all(
      agg.map(async (row: any) => {
        const user = await User.findById(row._id).lean() as any;
        return {
          userId: row._id,
          userName: user?.name ?? "Unknown",
          userAvatar: user?.avatarUrl ?? null,
          totalLessons: row.totalLessons,
          completedLessons: row.completedLessons,
          watchedSeconds: row.watchedSeconds,
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lessons/:lessonId/comments", async (req, res) => {
  try {
    const lessonId = Number(req.params.lessonId);
    const rows = await LessonComment.find({ lessonId }).sort({ createdAt: -1 }).lean() as any[];
    const enriched = await Promise.all(
      rows.map(async (c) => {
        const u = await User.findById(c.userId).lean() as any;
        return { ...toDoc(c), userName: u?.name ?? "User", userAvatar: u?.avatarUrl ?? null };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lessons/:lessonId/comments", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const lessonId = Number(req.params.lessonId);
    const { content, parentId } = req.body as { content?: string; parentId?: number };
    if (!content?.trim()) { res.status(400).json({ error: "Comment is empty" }); return; }
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }

    const lesson = await Lesson.findById(lessonId).lean() as any;
    const comment = await LessonComment.create({
      _id: await nextId("lessonComments"),
      lessonId,
      courseId: lesson?.courseId ?? null,
      userId: lu._id,
      parentId: parentId ?? null,
      content: content.trim(),
    });

    if (lesson) {
      const course = await Course.findById(lesson.courseId).lean() as any;
      if (course) {
        await createNotification({
          userId: String(course.creatorId),
          fromUserId: String(lu._id),
          fromUserName: lu.name,
          type: "lesson_comment",
          entityId: lessonId,
          entityTitle: lesson.title,
          message: `${lu.name} علّق على "${lesson.title}" في كورسك "${course.title}"`,
        });
      }
    }

    res.status(201).json({
      ...toDoc(comment.toObject()),
      userName: lu.name,
      userAvatar: lu.avatarUrl ?? null,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/lessons/:lessonId/comments/:commentId", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const commentId = Number(req.params.commentId);
    const lessonId = Number(req.params.lessonId);
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }

    const comment = await LessonComment.findById(commentId).lean() as any;
    if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }

    const isOwner = String(comment.userId) === String(lu._id);
    if (!isOwner && lu.role !== "admin") {
      const lesson = await Lesson.findById(lessonId).lean() as any;
      if (lesson) {
        const course = await Course.findById(lesson.courseId).lean() as any;
        const isCreator = course && String(course.creatorId) === String(lu._id);
        if (!isCreator) {
          res.status(403).json({ error: "Forbidden" }); return;
        }
      } else {
        res.status(403).json({ error: "Forbidden" }); return;
      }
    }

    await LessonComment.findByIdAndDelete(commentId);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lessons/:lessonId/likes", async (req, res) => {
  const s = getUser(req);
  try {
    const lessonId = Number(req.params.lessonId);
    const count = await LessonLike.countDocuments({ lessonId });
    let liked = false;
    if (s) {
      const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
      if (lu) liked = !!(await LessonLike.findOne({ lessonId, userId: lu._id }).lean());
    }
    res.json({ count, liked });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lessons/:lessonId/like", async (req, res) => {
  const s = getUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const lessonId = Number(req.params.lessonId);
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const existing = await LessonLike.findOne({ lessonId, userId: lu._id }).lean() as any;
    if (existing) {
      await LessonLike.findByIdAndDelete(existing._id);
      res.json({ liked: false, count: await LessonLike.countDocuments({ lessonId }) });
      return;
    }
    const lesson = await Lesson.findById(lessonId).lean() as any;
    await LessonLike.create({ _id: await nextId("lessonLikes"), lessonId, userId: lu._id });

    if (lesson) {
      const course = await Course.findById(lesson.courseId).lean() as any;
      if (course) {
        await createNotification({
          userId: String(course.creatorId),
          fromUserId: String(lu._id),
          fromUserName: lu.name,
          type: "lesson_like",
          entityId: lessonId,
          entityTitle: lesson.title,
          message: `${lu.name} أعجب بـ"${lesson.title}" في كورسك "${course.title}"`,
        });
      }
    }

    res.json({ liked: true, count: await LessonLike.countDocuments({ lessonId }) });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
