import { Router } from "express";
import {
  Course, Lesson, Review, User,
  LessonComment, LessonLike, LessonProgress,
  Notification, nextId, toDoc, toDocs,
} from "@workspace/db";
import {
  CreateCourseBody, ListCoursesQueryParams, CreateReviewBody,
} from "@workspace/api-zod";

const router = Router();

function getSessionUser(req: any): { id: string } | null {
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

async function enrichCourse(c: any) {
  const creator = await User.findById(c.creatorId).lean() as any;
  const reviews = await Review.find({ courseId: c._id }).lean() as any[];
  const avg =
    reviews.length > 0
      ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
      : 0;
  const lessonCount = await Lesson.countDocuments({ courseId: c._id });
  return {
    ...toDoc(c),
    creatorName: creator?.name ?? "Unknown",
    creatorAvatar: creator?.avatarUrl ?? null,
    creatorClerkId: creator?.clerkId ?? null,
    averageRating: parseFloat(avg.toFixed(2)),
    totalReviews: reviews.length,
    totalLessons: lessonCount,
  };
}

function nullToUndef(v: any): any {
  return v === null ? undefined : v;
}

router.get("/courses", async (req, res) => {
  try {
    const query = ListCoursesQueryParams.parse(req.query);
    const rows = await Course.find()
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .skip(query.offset)
      .lean();
    const total = await Course.countDocuments();
    res.json({ courses: await Promise.all(rows.map(enrichCourse)), total });
  } catch (err) {
    req.log.error({ err }, "Failed to list courses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const body = CreateCourseBody.parse(req.body);

    const id = await nextId("courses");

    const course = await Course.create({
      _id: id,
      ...body,
    });

    const creator = await User.findById(body.creatorId).lean() as any;

    res.status(201).json({
      ...toDoc(course.toObject()),
      creatorName: creator?.name ?? "Unknown",
      creatorAvatar: creator?.avatarUrl ?? null,
      creatorClerkId: creator?.clerkId ?? null,
      averageRating: 0,
      totalReviews: 0,
      totalLessons: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/featured", async (req, res) => {
  try {
    const rows = await Course.find().sort({ totalEnrollments: -1 }).limit(6).lean();
    res.json(await Promise.all(rows.map(enrichCourse)));
  } catch (err) {
    req.log.error({ err }, "Failed to get featured courses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/courses/:courseId", async (req, res) => {
  try {
    const id = Number(req.params.courseId);
    const s = getSessionUser(req);
    if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
    const localUser = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    const course = await Course.findById(id).lean() as any;
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (!localUser || (localUser.role !== "admin" && course.creatorId !== String(localUser._id))) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const lessons = await Lesson.find({ courseId: id }).lean() as any[];
    const lessonIds = lessons.map((l: any) => l._id);
    await Promise.all([
      LessonComment.deleteMany({ lessonId: { $in: lessonIds } }),
      LessonLike.deleteMany({ lessonId: { $in: lessonIds } }),
      LessonProgress.deleteMany({ courseId: id }),
      Review.deleteMany({ courseId: id }),
      Lesson.deleteMany({ courseId: id }),
    ]);
    await Course.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId", async (req, res) => {
  try {
    const id = Number(req.params.courseId);
    const course = await Course.findById(id).lean() as any;
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    const [lessons, creator, reviews] = await Promise.all([
      Lesson.find({ courseId: id }).sort({ order: 1 }).lean(),
      User.findById(course.creatorId).lean() as any,
     Review.find({ courseId: id }).lean() as any[],
    ]);
    const avg =
      reviews.length > 0
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
        : 0;
    res.json({
      ...toDoc(course),
      lessons: toDocs(lessons),
      creatorName: (creator as any)?.name ?? "Unknown",
      creatorAvatar: (creator as any)?.avatarUrl ?? null,
      creatorClerkId: (creator as any)?.clerkId ?? null,
      averageRating: parseFloat(avg.toFixed(2)),
      totalReviews: reviews.length,
      totalLessons: lessons.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/lessons", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const rb = req.body as any;

    // Ownership check — only the course creator may add lessons
    const s = getSessionUser(req);
    if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
    const localUser = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!localUser) { res.status(401).json({ error: "User not found" }); return; }
    const course = await Course.findById(courseId).lean() as any;
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    const isOwner = String(course.creatorId) === String(localUser._id);
    const isAdmin = localUser.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "ليس لديك صلاحية إضافة دروس لهذا الكورس" }); return;
    }

    // Validate required fields
    if (!rb.title?.trim()) {
      res.status(400).json({ error: "Lesson title is required" }); return;
    }

    const id = await nextId("lessons");
    const lesson = await Lesson.create({
      _id: id,
      courseId,
      title: String(rb.title).trim(),
      description: rb.description ? String(rb.description).trim() : "",
      videoUrl: rb.videoUrl || null,
      pdfUrl: rb.pdfUrl || null,
      attachmentUrl: rb.attachmentUrl || null,
      attachmentName: rb.attachmentName || null,
      duration: rb.duration != null && rb.duration !== "" ? Number(rb.duration) : null,
      order: rb.order != null && rb.order !== "" ? Number(rb.order) : 0,
    });
    res.status(201).json(toDoc(lesson.toObject()));
  } catch (err) {
    req.log.error({ err }, "Failed to create lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/courses/:courseId/lessons/:lessonId", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const lessonId = Number(req.params.lessonId);
    const s = getSessionUser(req);
    if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
    const localUser = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!localUser) { res.status(401).json({ error: "User not found" }); return; }
    const course = await Course.findById(courseId).lean() as any;
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    const isOwner = String(course.creatorId) === String(localUser._id);
    const isAdmin = localUser.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "ليس لديك صلاحية حذف دروس هذا الكورس" }); return;
    }
    const lesson = await Lesson.findById(lessonId).lean() as any;
    if (!lesson || Number(lesson.courseId) !== courseId) {
      res.status(404).json({ error: "Lesson not found in this course" }); return;
    }
    await Promise.all([
      LessonComment.deleteMany({ lessonId }),
      LessonLike.deleteMany({ lessonId }),
      LessonProgress.deleteMany({ lessonId }),
    ]);
    await Lesson.findByIdAndDelete(lessonId);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/reviews", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const reviews = await Review.find({ courseId }).sort({ createdAt: -1 }).lean() as any[];
    const enriched = await Promise.all(
      reviews.map(async (r) => {
        const user = await User.findById(r.userId).lean() as any;
        return { ...toDoc(r), userName: user?.name ?? "Unknown", userAvatar: user?.avatarUrl ?? null };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to get reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/reviews", async (req, res) => {
  const s = getSessionUser(req);
  try {
    const courseId = Number(req.params.courseId);
    const body = CreateReviewBody.parse(req.body);
    const id = await nextId("reviews");
    const review = await Review.create({ _id: id, ...body, courseId });
    const user = await User.findById(body.userId).lean() as any;

    const course = await Course.findById(courseId).lean() as any;
    if (course && s) {
      const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
      if (lu) {
        await createNotification({
          userId: String(course.creatorId),
          fromUserId: String(lu._id),
          fromUserName: lu.name,
          type: "course_rating",
          entityId: courseId,
          entityTitle: course.title,
          message: `${lu.name} قيّم كورسك "${course.title}" بـ${body.rating} نجوم`,
        });
      }
    }

    res.status(201).json({
      ...toDoc(review.toObject()),
      userName: user?.name ?? "Unknown",
      userAvatar: user?.avatarUrl ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create review");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/courses/:courseId/reviews/:reviewId", async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const s = getSessionUser(req);
    if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
    const localUser = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    const review = await Review.findById(reviewId).lean() as any;
    if (!review) { res.status(404).json({ error: "Review not found" }); return; }
    const isOwner = String(review.userId) === String(localUser?._id);
    if (!localUser || (!isOwner && localUser.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await Review.findByIdAndDelete(reviewId);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete review");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Home Reviews (Homepage "آراء طلابنا") ──────────────────────────────────
router.post("/home-reviews", async (req, res) => {
  try {
    const { rating, comment, reviewerName } = req.body;
    const r = Number(rating);
    if (!r || r < 1 || r > 5) { res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" }); return; }
    if (!String(comment ?? "").trim()) { res.status(400).json({ error: "التعليق مطلوب" }); return; }
    const id = await nextId("reviews");
    await Review.create({
      _id: id,
      courseId: 0,
      userId: "home",
      rating: r,
      comment: String(comment).trim(),
      reviewerName: String(reviewerName ?? "زائر").trim() || "زائر",
      status: "pending",
    });
    res.status(201).json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to create home review");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/home-reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ courseId: 0, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean() as any[];
    res.json(reviews.map((r: any) => ({
      id: String(r._id),
      reviewerName: r.reviewerName ?? "زائر",
      rating: r.rating,
      comment: r.comment ?? "",
      createdAt: r.createdAt,
    })));
  } catch (err: any) {
    req.log.error({ err }, "Failed to get home reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
