import mongoose, { Schema, model } from "mongoose";

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  export function toDoc(doc: any): any {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id };
  }
  export function toDocs(docs: any[]): any[] {
    return docs.map(toDoc);
  }

  // ─── Auto-increment counter ───────────────────────────────────────────────────
  const CounterSchema = new Schema(
    { _id: { type: String }, seq: { type: Number, default: 0 } },
    { versionKey: false }
  );
  const Counter =
    (mongoose.models["Counter"] as mongoose.Model<any>) ??
    model("Counter", CounterSchema);

  export async function nextId(name: string): Promise<number> {
    const doc = await Counter.findByIdAndUpdate(
      name,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean();
    return (doc as any).seq as number;
  }

  // ─── Users ────────────────────────────────────────────────────────────────────
  const UserSchema = new Schema(
    {
      _id: { type: String },
      clerkId: { type: String, required: false, unique: true, sparse: true },
      name: { type: String, required: true },
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, default: null },
      avatarUrl: { type: String, default: null },
      bio: { type: String, default: null },
      role: { type: String, enum: ["user", "creator", "employer", "admin"], default: "user" },
      banned: { type: Boolean, default: false },
      points: { type: Number, default: 0 },
      globalRank: { type: Number, default: null },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const User =
    (mongoose.models["User"] as mongoose.Model<any>) ?? model("User", UserSchema);

  // ─── Courses ──────────────────────────────────────────────────────────────────
  const CourseSchema = new Schema(
    {
      _id: { type: Number },
      title: { type: String, required: true },
      description: { type: String, required: true },
      thumbnailUrl: { type: String, default: null },
      category: { type: String, required: true },
      level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
      language: { type: String, default: null },
      creatorId: { type: String, required: true },
      totalEnrollments: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const Course =
    (mongoose.models["Course"] as mongoose.Model<any>) ?? model("Course", CourseSchema);

  // ─── Lessons ──────────────────────────────────────────────────────────────────
  const LessonSchema = new Schema(
    {
      _id: { type: Number },
      courseId: { type: Number, required: true },
      title: { type: String, required: true },
      description: { type: String, default: "" },
      videoUrl: { type: String, default: null },
      pdfUrl: { type: String, default: null },
      attachmentUrl: { type: String, default: null },
      attachmentName: { type: String, default: null },
      duration: { type: Number, default: null },
      order: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const Lesson =
    (mongoose.models["Lesson"] as mongoose.Model<any>) ?? model("Lesson", LessonSchema);

  // ─── Enrollments ──────────────────────────────────────────────────────────────
  const EnrollmentSchema = new Schema(
    {
      _id: { type: Number },
      userId: { type: String, required: true },
      courseId: { type: Number, required: true },
      progress: { type: Number, default: 0 },
      completedAt: { type: Date, default: null },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const Enrollment =
    (mongoose.models["Enrollment"] as mongoose.Model<any>) ?? model("Enrollment", EnrollmentSchema);

  // ─── Challenges ───────────────────────────────────────────────────────────────
  const ChallengeSchema = new Schema(
    {
      _id: { type: Number },
      title: { type: String, required: true },
      description: { type: String, required: true },
      difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
      category: { type: String, required: true },
      section: { type: String, default: "algorithms" },
      points: { type: Number, default: 10 },
      totalSubmissions: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const Challenge =
    (mongoose.models["Challenge"] as mongoose.Model<any>) ?? model("Challenge", ChallengeSchema);

  // ─── Submissions ──────────────────────────────────────────────────────────────
  const SubmissionSchema = new Schema(
    {
      _id: { type: Number },
      challengeId: { type: Number, required: true },
      userId: { type: String, required: true },
      solution: { type: String, required: true },
      language: { type: String, required: true },
      success: { type: Boolean, default: false },
      pointsEarned: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const Submission =
    (mongoose.models["Submission"] as mongoose.Model<any>) ?? model("Submission", SubmissionSchema);

  // ─── Repositories ─────────────────────────────────────────────────────────────
  const RepositorySchema = new Schema(
    {
      _id: { type: Number },
      title: { type: String, required: true },
      description: { type: String, default: "" },
      technologies: { type: [String], default: [] },
      repoUrl: { type: String, default: null },
      liveDemoUrl: { type: String, default: null },
      fileUrl: { type: String, default: null },
      codeFilesUrls: { type: [String], default: [] },
      pdfFilesUrls: { type: [String], default: [] },
      coverImageUrl: { type: String, default: null },
      userId: { type: String, required: true },
      likes: { type: Number, default: 0 },
      isPublic: { type: Boolean, default: true },
      isDraft: { type: Boolean, default: false },
      sourceProject: { type: String, default: null },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const Repository =
    (mongoose.models["Repository"] as mongoose.Model<any>) ?? model("Repository", RepositorySchema);

  // ─── Repo Likes ───────────────────────────────────────────────────────────────
  const RepoLikeSchema = new Schema(
    {
      _id: { type: Number },
      repositoryId: { type: Number, required: true },
      userId: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const RepoLike =
    (mongoose.models["RepoLike"] as mongoose.Model<any>) ?? model("RepoLike", RepoLikeSchema);

  // ─── Login Logs ───────────────────────────────────────────────────────────────
  const LoginLogSchema = new Schema(
    {
      _id: { type: Number },
      userId: { type: String, default: null },
      email: { type: String, required: true },
      firstName: { type: String, default: null },
      action: { type: String, enum: ["login", "register", "login_failed", "register_failed"], required: true },
      ipAddress: { type: String, default: null },
      userAgent: { type: String, default: null },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const LoginLog =
    (mongoose.models["LoginLog"] as mongoose.Model<any>) ?? model("LoginLog", LoginLogSchema);

  // ─── Community Posts ──────────────────────────────────────────────────────────
  const CommunityPostSchema = new Schema(
    {
      _id: { type: Number },
      userId: { type: String, required: true },
      title: { type: String, required: true },
      body: { type: String, required: true },
      tags: { type: [String], default: [] },
      likesCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
  );
  export const CommunityPost =
    (mongoose.models["CommunityPost"] as mongoose.Model<any>) ?? model("CommunityPost", CommunityPostSchema);

  // ─── Reviews ──────────────────────────────────────────────────────────────
const ReviewSchema = new Schema(
  {
    _id: { type: Number },
    courseId: { type: Number, required: true },
    userId: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, default: "" },
    reviewerName: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const Review =
  (mongoose.models["Review"] as mongoose.Model<any>) ??
  model("Review", ReviewSchema);

// ─── Lesson Comments ──────────────────────────────────────────────────────
const LessonCommentSchema = new Schema(
  {
    _id: { type: Number },
    lessonId: { type: Number, required: true },
    courseId: { type: Number, default: null },
    userId: { type: String, required: true },
    parentId: { type: Number, default: null },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const LessonComment =
  (mongoose.models["LessonComment"] as mongoose.Model<any>) ??
  model("LessonComment", LessonCommentSchema);

// ─── Lesson Likes ─────────────────────────────────────────────────────────
const LessonLikeSchema = new Schema(
  {
    _id: { type: Number },
    lessonId: { type: Number, required: true },
    courseId: { type: Number, default: null },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const LessonLike =
  (mongoose.models["LessonLike"] as mongoose.Model<any>) ??
  model("LessonLike", LessonLikeSchema);

// ─── Lesson Progress ──────────────────────────────────────────────────────
const LessonProgressSchema = new Schema(
  {
    _id: { type: Number },
    lessonId: { type: Number, required: true },
    courseId: { type: Number, default: null },
    userId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    watchedSeconds: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const LessonProgress =
  (mongoose.models["LessonProgress"] as mongoose.Model<any>) ??
  model("LessonProgress", LessonProgressSchema);

// ─── Community Post Likes ─────────────────────────────────────────────────
const CommunityPostLikeSchema = new Schema(
  {
    _id: { type: Number },
    postId: { type: Number, required: true },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const CommunityPostLike =
  (mongoose.models["CommunityPostLike"] as mongoose.Model<any>) ??
  model("CommunityPostLike", CommunityPostLikeSchema);

// ─── Community Post Comments ──────────────────────────────────────────────
const CommunityPostCommentSchema = new Schema(
  {
    _id: { type: Number },
    postId: { type: Number, required: true },
    userId: { type: String, required: true },
    parentId: { type: Number, default: null },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const CommunityPostComment =
  (mongoose.models["CommunityPostComment"] as mongoose.Model<any>) ??
  model("CommunityPostComment", CommunityPostCommentSchema);

// ─── Notifications ────────────────────────────────────────────────────────
const NotificationSchema = new Schema(
  {
    _id: { type: Number },
    userId: { type: String, required: true },
    fromUserId: { type: String, required: true },
    fromUserName: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "post_like", "post_comment", "comment_reply",
        "lesson_like", "lesson_comment",
        "course_like", "course_comment", "course_rating",
      ],
      required: true,
    },
    entityId: { type: Number, default: null },
    entityTitle: { type: String, default: "" },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const Notification =
  (mongoose.models["Notification"] as mongoose.Model<any>) ??
  model("Notification", NotificationSchema);
