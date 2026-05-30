import { useEffect, useMemo, useState, useRef } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import {
  useListUsers,
  useListCourses,
  useCreateCourse,
  useUpdateUser,
} from "@workspace/api-client-react";
import {
  Users, BookOpen, ShieldCheck, Plus, X, Pencil, ChevronDown,
  BarChart2, Trophy, Activity, Upload, FileText, Video,
  Trash2, CheckCircle, AlertCircle, Loader2, Paperclip, MessageCircle, ThumbsUp
} from "lucide-react";
import { useCreateChallenge } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AdminTab = "overview" | "users" | "courses" | "engagement" | "activity";

type LoginLog = {
  id: number;
  userId: string | null;
  email: string;
  firstName: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type EngagementItem = {
  id: string;
  userName: string;
  lessonTitle: string;
  courseTitle: string;
  type: "like" | "comment";
  content?: string;
  createdAt: string;
};

type CommentModeration = {
  id: string;
  userName: string;
  lessonTitle: string;
  courseTitle: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type ReviewModeration = {
  id: string;
  userName: string;
  userAvatar: string | null;
  courseTitle: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Course = {
  id: number;
  title: string;
  category: string;
  level: string;
  creatorName?: string;
};

type LessonDraft = {
  id: string;
  title: string;
  description: string;
  videoFile: File | null;
  videoLabel: string;
  videoUrl: string;
  pdfFile: File | null;
  pdfLabel: string;
  pdfUrl: string;
  attachmentFile: File | null;
  attachmentLabel: string;
  attachmentUrl: string;
  duration: string;
  order: string;
  uploadProgress: number;
  uploading: boolean;
  uploaded: boolean;
  error: string;
  success: string;
};

type UploadState = {
  [courseId: number]: {
    activeLessonId: string | null;
    progress: number;
  };
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "تسجيل دخول", color: "bg-green-50 text-green-600" },
  register: { label: "تسجيل جديد", color: "bg-blue-50 text-blue-600" },
  login_failed: { label: "فشل الدخول", color: "bg-red-50 text-red-600" },
  register_failed: { label: "فشل التسجيل", color: "bg-orange-50 text-orange-600" },
};

const CHALLENGE_CATEGORIES = ["الخوارزميات", "هياكل البيانات", "تطوير الويب", "قواعد البيانات", "backend", "الكل"] as const;
const CHALLENGE_SECTIONS = [
  { value: "algorithms", label: "الخوارزميات" },
  { value: "data-structures", label: "هياكل البيانات" },
  { value: "web", label: "تطوير الويب" },
  { value: "databases", label: "قواعد البيانات" },
  { value: "backend", label: "backend" },
  { value: "all", label: "الكل" },
] as const;

function formatDate(d: string) {
  return new Date(d).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
}

function newLesson(): LessonDraft {
  return {
    id: Math.random().toString(36).slice(2),
    title: "",
    description: "",
    videoFile: null,
    videoLabel: "",
    videoUrl: "",
    pdfFile: null,
    pdfLabel: "",
    pdfUrl: "",
    attachmentFile: null,
    attachmentLabel: "",
    attachmentUrl: "",
    duration: "",
    order: "",
    uploadProgress: 0,
    uploading: false,
    uploaded: false,
    error: "",
    success: "",
  };
}

async function uploadFile(file: File, onProgress?: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.file?.url ?? data.url ?? "");
      } else {
        reject(new Error("فشل رفع الملف"));
      }
    });
   xhr.addEventListener("error", () => reject(new Error("خطأ في الاتصال")));

xhr.open("POST", `${BASE}/api/upload`);

xhr.withCredentials = true;

xhr.setRequestHeader("X-Upload-Mode", "lesson");

xhr.send(form);
  });
}

export default function AdminPage() {
  const { user, isLoaded } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "", description: "", category: "", level: "beginner", creatorId: "",
  });
  const [lessons, setLessons] = useState<LessonDraft[]>([]);
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [appendCourseId, setAppendCourseId] = useState<number | null>(null);
  const [appendLessons, setAppendLessons] = useState<Record<number, LessonDraft[]>>({});
  const [appendSaving, setAppendSaving] = useState<Record<number, boolean>>({});
  const [appendError, setAppendError] = useState<Record<number, string>>({});
  const [appendUploadState, setAppendUploadState] = useState<UploadState>({});
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    category: "الخوارزميات",
    section: "algorithms",
    points: "10",
  });
  const [challengeSaving, setChallengeSaving] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [challengeSuccess, setChallengeSuccess] = useState("");

  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [engagements, setEngagements] = useState<EngagementItem[]>([]);
  const [engagementsLoading, setEngagementsLoading] = useState(false);
  const [comments, setComments] = useState<CommentModeration[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewModeration[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());

  const { data: usersData, refetch: refetchUsers } = useListUsers();
  const { data: coursesData, refetch: refetchCourses } = useListCourses();

  const createCourse = useCreateCourse();
  const createChallenge = useCreateChallenge();
  const updateUser = useUpdateUser();

  const users = usersData?.users ?? [];
  const courses = coursesData?.courses ?? [];
  const creators = users.filter((u) => u.role === "creator" || u.role === "admin");
  const totalLessons = courses.reduce((sum, course: any) => sum + (course.totalLessons ?? 0), 0);

  // Auto-select the logged-in admin as the default creator when the form opens
  useEffect(() => {
  if (showCourseForm && user?.id && !courseForm.creatorId) {
    setCourseForm((p) => ({ ...p, creatorId: user.id }));
  }
}, [showCourseForm, user?.id]);

  const handleTabChange = (tab: AdminTab) => setActiveTab(tab);
  const handleCreateChallenge = async () => {
    if (!challengeForm.title || !challengeForm.description) {
      setChallengeError("العنوان والوصف مطلوبان");
      return;
    }
    setChallengeSaving(true);
    setChallengeError("");
    setChallengeSuccess("");
    try {
      await new Promise<void>((resolve, reject) => {
        createChallenge.mutate(
          {
            data: {
              title: challengeForm.title,
              description: challengeForm.description,
              difficulty: challengeForm.difficulty as "easy" | "medium" | "hard",
              category: challengeForm.category,
              points: Number(challengeForm.points) || 10,
            },
          },
          { onSuccess: () => resolve(), onError: reject }
        );
      });
      setShowChallengeForm(false);
      setChallengeForm({
        title: "",
        description: "",
        difficulty: "easy",
        category: "الخوارزميات",
        section: "algorithms",
        points: "10",
      });
      setChallengeSuccess("تمت إضافة التحدي بنجاح");
    } catch (err: any) {
      setChallengeError(err?.message ?? "فشل إنشاء التحدي");
    } finally {
      setChallengeSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-400">جاري التحميل...</div>
      </div>
    );
  }

  const updateLesson = (id: string, patch: Partial<LessonDraft>) => {
    setLessons((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  };

  const updateAppendLesson = (courseId: number, id: string, patch: Partial<LessonDraft>) => {
    setAppendLessons((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const handleSetRole = async (userId: string, role: "user" | "creator" | "admin") => {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    refetchUsers();
  };

  const removeAppendLessonVideo = (courseId: number, lessonId: string) => {
    updateAppendLesson(courseId, lessonId, {
      videoFile: null,
      videoLabel: "",
      videoUrl: "",
      uploadProgress: 0,
      uploading: false,
      uploaded: false,
      success: "",
      error: "",
    });
  };

  const handleVideoSelect = (lessonId: string, file: File) => {
    updateLesson(lessonId, { videoFile: file, videoLabel: file.name, videoUrl: "", error: "" });
  };

  const handlePdfSelect = (lessonId: string, file: File) => {
    updateLesson(lessonId, { pdfFile: file, pdfLabel: file.name, pdfUrl: "", error: "" });
  };

  const handleAttachmentSelect = (lessonId: string, file: File) => {
    updateLesson(lessonId, { attachmentFile: file, attachmentLabel: file.name, attachmentUrl: "", error: "" });
  };

  const handleAppendVideoSelect = (courseId: number, lessonId: string, file: File) => {
    updateAppendLesson(courseId, lessonId, { videoFile: file, videoLabel: file.name, videoUrl: "", error: "", success: "" });
  };

  const handleAppendPdfSelect = (courseId: number, lessonId: string, file: File) => {
    updateAppendLesson(courseId, lessonId, { pdfFile: file, pdfLabel: file.name, pdfUrl: "", error: "", success: "" });
  };

  const handleAppendAttachmentSelect = (courseId: number, lessonId: string, file: File) => {
    updateAppendLesson(courseId, lessonId, { attachmentFile: file, attachmentLabel: file.name, attachmentUrl: "", error: "", success: "" });
  };

  const uploadLessonFiles = async (lesson: LessonDraft): Promise<{ videoUrl: string; pdfUrl: string; attachmentUrl: string }> => {
    let videoUrl = lesson.videoUrl;
    let pdfUrl = lesson.pdfUrl;
    let attachmentUrl = lesson.attachmentUrl;

    updateLesson(lesson.id, { uploading: true, uploadProgress: 0, error: "", success: "" });

    try {
      if (lesson.videoFile) {
        videoUrl = await uploadFile(lesson.videoFile, (p) =>
          updateLesson(lesson.id, { uploadProgress: Math.round(p * 0.6) })
        );
      }
      if (lesson.pdfFile) {
        pdfUrl = await uploadFile(lesson.pdfFile, (p) =>
          updateLesson(lesson.id, { uploadProgress: 60 + Math.round(p * 0.2) })
        );
      }
      if (lesson.attachmentFile) {
        attachmentUrl = await uploadFile(lesson.attachmentFile, (p) =>
          updateLesson(lesson.id, { uploadProgress: 80 + Math.round(p * 0.2) })
        );
      }
      updateLesson(lesson.id, { uploading: false, uploaded: true, uploadProgress: 100, videoUrl, pdfUrl, attachmentUrl, success: "تم رفع الملف بنجاح" });
    } catch (err: any) {
      updateLesson(lesson.id, { uploading: false, error: err.message ?? "فشل الرفع" });
      throw err;
    }

    return { videoUrl, pdfUrl, attachmentUrl };
  };

  const uploadAppendLessonFiles = async (lesson: LessonDraft) => {
    return uploadLessonFiles(lesson);
  };

  const uploadWithProgress = async (
    courseId: number,
    lesson: LessonDraft
  ) => {
    if (!lesson.videoFile) throw new Error("يجب رفع فيديو الدرس");
    updateAppendLesson(courseId, lesson.id, {
      uploading: true,
      uploadProgress: 0,
      success: "",
      error: "",
    });
    try {
      const videoUrl = await uploadFile(lesson.videoFile, (p) => {
        const staged = Math.min(99, Math.max(1, p));
        updateAppendLesson(courseId, lesson.id, {
          uploadProgress: staged,
          uploading: true,
        });
      });
      updateAppendLesson(courseId, lesson.id, {
        uploading: false,
        uploaded: true,
        uploadProgress: 100,
        videoUrl,
        success: "تم رفع الفيديو بنجاح",
      });
      return videoUrl;
    } catch (err: any) {
      removeAppendLessonVideo(courseId, lesson.id);
      updateAppendLesson(courseId, lesson.id, {
        uploading: false,
        uploadProgress: 0,
        success: "",
        error: err?.message ?? "فشل رفع الفيديو",
      });
      throw err;
    }
  };

  const createLessonInCourse = async (courseId: number, lesson: LessonDraft, order: number) => {
    const files = await uploadLessonFiles(lesson);
    const res = await fetch(`/api/courses/${courseId}/lessons`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: lesson.title,
        description: lesson.description || "",
        videoUrl: files.videoUrl || null,
        pdfUrl: files.pdfUrl || null,
        attachmentUrl: files.attachmentUrl || null,
        attachmentName: lesson.attachmentFile?.name ?? null,
        duration: lesson.duration ? Number(lesson.duration) : null,
        order: lesson.order ? Number(lesson.order) : order,
      }),
    });
    if (!res.ok) {
      throw new Error("فشل حفظ الدرس داخل الكورس");
    }
  };

  const handleCreateCourse = async () => {
    if (!courseForm.title || !courseForm.category) return;
    setSavingCourse(true);
    setCourseError("");

    try {
      const creatorId = courseForm.creatorId || user?.id || (users[0]?.id ?? "");

      const created = await new Promise<{ id: number }>((resolve, reject) => {
        createCourse.mutate(
          {
            data: {
              title: courseForm.title,
              description: courseForm.description,
              category: courseForm.category,
              level: courseForm.level as "beginner" | "intermediate" | "advanced",
              creatorId,
            },
          },
          { onSuccess: resolve, onError: reject }
        );
      });

      for (const lesson of lessons) {
        if (!lesson.title) continue;
        await createLessonInCourse(created.id, lesson, lessons.indexOf(lesson));
      }

      setShowCourseForm(false);
      setCourseForm({ title: "", description: "", category: "", level: "beginner", creatorId: "" });
      setLessons([]);
      refetchCourses();
    } catch (err: any) {
      setCourseError(err?.message ?? "حدث خطأ أثناء إنشاء الكورس");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleAppendCourse = async (courseId: number) => {
    const courseLessons = appendLessons[courseId] ?? [];
    if (courseLessons.length === 0) return;
    setAppendSaving((p) => ({ ...p, [courseId]: true }));
    setAppendError((p) => ({ ...p, [courseId]: "" }));
    try {
      for (const lesson of courseLessons) {
        if (!lesson.title) continue;
        await createLessonInCourse(courseId, lesson, courseLessons.indexOf(lesson));
      }
      setAppendCourseId(null);
      refetchCourses();
    } catch (err: any) {
      setAppendError((p) => ({ ...p, [courseId]: err?.message ?? "حدث خطأ أثناء استكمال الكورس" }));
    } finally {
      setAppendSaving((p) => ({ ...p, [courseId]: false }));
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm("هل تريد حذف هذا الكورس نهائياً؟")) return;
    try {
      const res = await fetch(`${BASE}/api/courses/${courseId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("delete failed");
      refetchCourses();
    } catch {
      setCourseError("حدث خطأ أثناء حذف الكورس");
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/logs", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { logs?: LoginLog[] };
      setLogs(data.logs ?? []);
      setLogsLoaded(true);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadEngagements = async () => {
    setEngagementsLoading(true);
    try {
      const res = await fetch("/api/admin/engagements", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { engagements?: EngagementItem[] };
      setEngagements(data.engagements ?? []);
    } catch {
      setEngagements([]);
    } finally {
      setEngagementsLoading(false);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch("/api/admin/comments", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { comments?: CommentModeration[] };
      setComments(data.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch("/api/admin/reviews", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { reviews?: ReviewModeration[] };
      setReviews(data.reviews ?? []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/approve`, { method: "POST", credentials: "include" });
      if (res.ok) setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, status: "approved" } : r));
    } catch { /* silent */ }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/reject`, { method: "POST", credentials: "include" });
      if (res.ok) setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, status: "rejected" } : r));
    } catch { /* silent */ }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch { /* silent */ }
  };

  const handleBanUser = async (userId: string | null) => {
    if (!userId) return;
    try {
      const isBanned = bannedUsers.has(userId);
      const endpoint = isBanned ? `/api/admin/users/${userId}/unban` : `/api/admin/users/${userId}/ban`;
      const res = await fetch(endpoint, { method: "POST", credentials: "include" });
      if (res.ok) {
        setBannedUsers((prev) => {
          const next = new Set(prev);
          if (isBanned) next.delete(userId); else next.add(userId);
          return next;
        });
      }
    } catch { /* silent */ }
  };

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "نظرة عامة", icon: <BarChart2 size={16} /> },
    { key: "users", label: "إدارة المستخدمين", icon: <Users size={16} /> },
    { key: "courses", label: "إدارة الكورسات", icon: <BookOpen size={16} /> },
    { key: "engagement", label: "Likes & Comments", icon: <MessageCircle size={16} /> },
    { key: "activity", label: "سجل النشاط", icon: <Activity size={16} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]" dir="rtl">
      <Navbar />

      <div className="py-8 px-4 text-center"
        style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3,#4c1d95)" }}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <ShieldCheck size={28} className="text-amber-400" />
          <h1 className="text-3xl font-extrabold text-white">لوحة التحكم الإدارية</h1>
        </div>
        <p className="text-indigo-200">مرحباً {user?.firstName ?? "المستخدم"}، أنت تملك صلاحيات كاملة</p>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 py-8">
        {challengeSuccess && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-3 mb-6 text-sm">
            <CheckCircle size={18} />
            {challengeSuccess}
          </div>
        )}
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Users size={24} className="text-indigo-500" />, value: usersData?.total ?? 0, label: "مستخدم" },
            { icon: <BookOpen size={24} className="text-teal-500" />, value: coursesData?.courses?.length ?? 0, label: "كورس" },
            { icon: <Video size={24} className="text-purple-500" />, value: totalLessons, label: "درس" },
            { icon: <Trophy size={24} className="text-amber-500" />, value: "6", label: "تحدي نشط" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
              {s.icon}
              <div className="text-2xl font-extrabold text-gray-900 mt-2">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
              style={activeTab === tab.key ? { background: "linear-gradient(90deg,#3730a3,#7c3aed)" } : {}}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowChallengeForm((p) => !p)}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}
            >
              {showChallengeForm ? "إخفاء" : "إضافة تحدي برمجي"}
            </button>
            <h3 className="font-bold text-gray-900 text-lg">إدارة التحديات البرمجية</h3>
          </div>
          {showChallengeForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={challengeForm.title} onChange={(e) => setChallengeForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="عنوان التحدي" />
              <select value={challengeForm.category} onChange={(e) => setChallengeForm((p) => ({ ...p, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                {CHALLENGE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={challengeForm.section} onChange={(e) => setChallengeForm((p) => ({ ...p, section: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                {CHALLENGE_SECTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <select value={challengeForm.difficulty} onChange={(e) => setChallengeForm((p) => ({ ...p, difficulty: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
              </select>
              <input value={challengeForm.points} onChange={(e) => setChallengeForm((p) => ({ ...p, points: e.target.value }))} type="number" min="1" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="النقاط" />
              <textarea value={challengeForm.description} onChange={(e) => setChallengeForm((p) => ({ ...p, description: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="وصف التحدي" />
              {challengeError && <div className="md:col-span-2 text-sm text-red-600">{challengeError}</div>}
              <div className="md:col-span-2 flex justify-end">
                <button onClick={handleCreateChallenge} disabled={challengeSaving} className="rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}>
                  {challengeSaving ? "جاري الحفظ..." : "حفظ التحدي"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 text-right">أحدث المستخدمين</h3>
              <div className="space-y-3">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      u.role === "admin" ? "bg-red-50 text-red-600" :
                      u.role === "creator" ? "bg-purple-50 text-purple-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>{u.role}</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 text-right">أحدث الكورسات</h3>
              <div className="space-y-3">
                {courses.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                      {LEVEL_LABELS[c.level] ?? c.level}
                    </span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 text-sm">{c.title}</div>
                      <div className="text-xs text-gray-400">{c.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Management */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{users.length} مستخدم</span>
              <h3 className="font-bold text-gray-900 text-lg">جميع المستخدمين</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-right text-gray-600 font-semibold">الإجراء</th>
                    <th className="py-3 px-4 text-right text-gray-600 font-semibold">الدور</th>
                    <th className="py-3 px-4 text-right text-gray-600 font-semibold">النقاط</th>
                    <th className="py-3 px-4 text-right text-gray-600 font-semibold">الاسم</th>
                    <th className="py-3 px-4 text-right text-gray-600 font-semibold">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex gap-2 flex-wrap">
                          {u.role !== "creator" && (
                            <button onClick={() => handleSetRole(u.id, "creator")}
                              className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium">
                              صانع محتوى
                            </button>
                          )}
                          {u.role !== "admin" && (
                            <button onClick={() => handleSetRole(u.id, "admin")}
                              className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 font-medium">
                              مسؤول
                            </button>
                          )}
                          {u.role !== "user" && (
                            <button onClick={() => handleSetRole(u.id, "user")}
                              className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">
                              مستخدم
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.role === "admin" ? "bg-red-50 text-red-600" :
                          u.role === "creator" ? "bg-purple-50 text-purple-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>{u.role}</span>
                      </td>
                      <td className="py-3 px-4 text-indigo-600 font-semibold">{u.points}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.username}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Courses Management */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => { setShowCourseForm(!showCourseForm); setLessons([]); setCourseError(""); }}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                {showCourseForm ? <X size={16} /> : <Plus size={16} />}
                {showCourseForm ? "إلغاء" : "إضافة كورس جديد"}
              </button>
              <h3 className="font-bold text-gray-900 text-lg">إدارة الكورسات</h3>
            </div>

            {showCourseForm && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h4 className="font-bold text-gray-900 text-right text-lg border-b pb-3">معلومات الكورس</h4>

                {/* Course info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">عنوان الكورس *</label>
                    <input value={courseForm.title}
                      onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="أدخل عنوان الكورس" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">التصنيف *</label>
                    <input value={courseForm.category}
                      onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="مثل: تطوير الويب" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">المستوى</label>
                    <div className="relative">
                      <select value={courseForm.level}
                        onChange={(e) => setCourseForm((p) => ({ ...p, level: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none bg-white">
                        <option value="beginner">مبتدئ</option>
                        <option value="intermediate">متوسط</option>
                        <option value="advanced">متقدم</option>
                      </select>
                      <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">صانع المحتوى</label>
                    <div className="relative">
                      <select value={courseForm.creatorId}
                        onChange={(e) => setCourseForm((p) => ({ ...p, creatorId: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none bg-white">
                        <option value="">اختر صانع المحتوى</option>
                        {creators.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">وصف الكورس</label>
                    <textarea value={courseForm.description}
                      onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      placeholder="وصف مختصر للكورس..." />
                  </div>
                </div>

                {/* Lessons section */}
                <div>
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <button onClick={() => setLessons((p) => [...p, newLesson()])}
                      className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                      <Plus size={16} />
                      إضافة درس
                    </button>
                    <h4 className="font-bold text-gray-900">الدروس ({lessons.length})</h4>
                  </div>

                  <div className="space-y-4">
                    {lessons.map((lesson, idx) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        index={idx}
                        onUpdate={(patch) => updateLesson(lesson.id, patch)}
                        onRemove={() => setLessons((p) => p.filter((l) => l.id !== lesson.id))}
                        onVideoSelect={(f) => handleVideoSelect(lesson.id, f)}
                        onPdfSelect={(f) => handlePdfSelect(lesson.id, f)}
                        onAttachmentSelect={(f) => handleAttachmentSelect(lesson.id, f)}
                      />
                    ))}
                    {lessons.length === 0 && (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <Video size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">لا توجد دروس بعد — اضغط "إضافة درس" لإضافة أول درس</p>
                      </div>
                    )}
                  </div>
                </div>

                {courseError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
                    <AlertCircle size={16} />
                    {courseError}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button onClick={handleCreateCourse}
                    disabled={!courseForm.title || !courseForm.category || savingCourse}
                    className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                    {savingCourse ? <><Loader2 size={16} className="animate-spin" /> جاري الحفظ والرفع...</> : "حفظ الكورس"}
                  </button>
                </div>
              </div>
            )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setShowCourseForm((p) => !p)}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                  إضافة درس
                </button>
                <h4 className="font-bold text-gray-900 text-right">{courses.length} كورس منشور</h4>
              </div>
              <div className="divide-y divide-gray-50">
                {courses.map((c) => (
                  <div key={c.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Link href={`/courses/${c.id}`}
                          className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium">
                          عرض
                        </Link>
                        <button
                          onClick={() => setAppendCourseId((p) => (p === c.id ? null : c.id))}
                          className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                        >
                          استكمال الكورس
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.id)}
                          className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                        >
                          حذف الكورس
                        </button>
                      </div>
                      <div className="text-right flex-1 mx-4">
                        <div className="font-medium text-gray-900">{c.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{c.category} · {LEVEL_LABELS[c.level] ?? c.level} · {c.creatorName}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                        {c.id}
                      </div>
                    </div>
                    {appendCourseId === c.id && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="rounded-2xl border border-gray-100 bg-[#fafafa] p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setAppendLessons((p) => ({ ...p, [c.id]: [...(p[c.id] ?? []), newLesson()] }))}
                              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              إضافة درس
                            </button>
                            <div className="font-bold text-gray-800">الدرس ({(appendLessons[c.id] ?? []).length || 1})</div>
                          </div>
                          {(appendLessons[c.id] ?? [newLesson()]).map((lesson, idx) => (
                            <div key={lesson.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setAppendLessons((p) => ({ ...p, [c.id]: (p[c.id] ?? []).filter((l) => l.id !== lesson.id) }))}
                                  className="text-red-500 text-sm"
                                >
                                  حذف
                                </button>
                                <div className="font-semibold text-gray-700">الدرس {idx + 1}</div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input value={lesson.title} onChange={(e) => updateAppendLesson(c.id, lesson.id, { title: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="عنوان الدرس" />
                                <input value={lesson.duration} onChange={(e) => updateAppendLesson(c.id, lesson.id, { duration: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="مثال: 15" />
                                <input value={lesson.order} onChange={(e) => updateAppendLesson(c.id, lesson.id, { order: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="ترتيب الفيديو" type="number" min="1" />
                              </div>
                              <textarea value={lesson.description} onChange={(e) => updateAppendLesson(c.id, lesson.id, { description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right resize-none" rows={2} placeholder="وصف مختصر لمحتوى الدرس..." />
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button onClick={() => document.getElementById(`append-video-${c.id}-${lesson.id}`)?.click()} className={`rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition-colors ${lesson.videoFile ? "border-indigo-300 bg-indigo-50" : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"}`}>
                                  <div className="flex flex-col items-center gap-2">
                                    <Video size={20} className={lesson.videoFile ? "text-indigo-600" : "text-gray-400"} />
                                    <span className="text-xs font-medium text-center">{lesson.videoLabel || "رفع فيديو"}</span>
                                    {lesson.videoFile && <span className="text-[11px] text-gray-400">{(lesson.videoFile.size / 1024 / 1024).toFixed(1)} MB</span>}
                                  </div>
                                </button>
                                <button onClick={() => document.getElementById(`append-pdf-${c.id}-${lesson.id}`)?.click()} className={`rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition-colors ${lesson.pdfFile ? "border-green-300 bg-green-50" : "border-gray-300 bg-white hover:border-green-300 hover:bg-green-50/50"}`}>
                                  <div className="flex flex-col items-center gap-2">
                                    <FileText size={20} className={lesson.pdfFile ? "text-green-600" : "text-gray-400"} />
                                    <span className="text-xs font-medium text-center">{lesson.pdfLabel || "رفع PDF"}</span>
                                  </div>
                                </button>
                                <button onClick={() => document.getElementById(`append-attach-${c.id}-${lesson.id}`)?.click()} className={`rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition-colors ${lesson.attachmentFile ? "border-amber-300 bg-amber-50" : "border-gray-300 bg-white hover:border-amber-300 hover:bg-amber-50/50"}`}>
                                  <div className="flex flex-col items-center gap-2">
                                    <Paperclip size={20} className={lesson.attachmentFile ? "text-amber-600" : "text-gray-400"} />
                                    <span className="text-xs font-medium text-center">{lesson.attachmentLabel || "رفع أكواد / ملفات"}</span>
                                  </div>
                                </button>
                              </div>
                              <input id={`append-video-${c.id}-${lesson.id}`} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAppendVideoSelect(c.id, lesson.id, e.target.files[0])} />
                              <input id={`append-pdf-${c.id}-${lesson.id}`} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleAppendPdfSelect(c.id, lesson.id, e.target.files[0])} />
                              <input id={`append-attach-${c.id}-${lesson.id}`} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleAppendAttachmentSelect(c.id, lesson.id, e.target.files[0])} />
                              {lesson.uploading && (
                                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                    <span>جاري الرفع...</span>
                                    <span>{lesson.uploadProgress}%</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                      className="h-2 rounded-full bg-indigo-500 transition-all"
                                      style={{ width: `${lesson.uploadProgress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {lesson.success && (
                                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                  {lesson.success}
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-red-600">{appendError[c.id] ?? ""}</div>
                                <button onClick={() => handleAppendCourse(c.id)} disabled={(appendLessons[c.id] ?? []).length === 0 || !!appendSaving[c.id]} className="rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#8b5cf6,#c084fc)" }}>
                                  {appendSaving[c.id] ? "جاري الحفظ..." : "حفظ الكورس"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "engagement" && (
          <div className="space-y-6">
            {/* ── Course Reviews Moderation ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => void loadReviews()} className="text-sm font-semibold text-indigo-600">تحديث</button>
                <h3 className="font-bold text-gray-900 text-lg">تقييمات الكورسات</h3>
              </div>
              {reviewsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 size={16} className="animate-spin" />
                  جاري التحميل...
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ThumbsUp size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">لا توجد تقييمات بعد</p>
                  <button onClick={() => void loadReviews()} className="mt-2 text-xs text-indigo-500 underline">تحميل التقييمات</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className={`rounded-2xl border p-4 transition-colors ${
                      review.status === "rejected" ? "border-red-100 bg-red-50/30" :
                      review.status === "approved" ? "border-green-100 bg-green-50/20" :
                      "border-gray-100"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleApproveReview(review.id)}
                            disabled={review.status === "approved"}
                            className="text-xs rounded-full px-3 py-1 font-semibold border border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ✓ قبول
                          </button>
                          <button
                            onClick={() => void handleRejectReview(review.id)}
                            disabled={review.status === "rejected"}
                            className="text-xs rounded-full px-3 py-1 font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ✕ رفض
                          </button>
                        </div>
                        <div className="text-right flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              review.status === "approved" ? "bg-green-100 text-green-700" :
                              review.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {review.status === "approved" ? "مقبول" : review.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                            </span>
                            <span className="text-yellow-500 text-sm">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                            <span className="font-semibold text-gray-800 text-sm">{review.userName}</span>
                          </div>
                          <p className="text-xs text-gray-500">{review.courseTitle}</p>
                          {review.comment && <p className="text-sm text-gray-700 mt-1">{review.comment}</p>}
                          <p className="text-xs text-gray-400 mt-1">{formatDate(review.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Lesson Comments ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => void loadComments()} className="text-sm font-semibold text-indigo-600">تحديث</button>
                <h3 className="font-bold text-gray-900 text-lg">تعليقات الدروس</h3>
              </div>
              {commentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 size={16} className="animate-spin" />
                  جاري التحميل...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">لا توجد تعليقات</p>
                  <button onClick={() => void loadComments()} className="mt-2 text-xs text-indigo-500 underline">تحميل التعليقات</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.slice(0, 30).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => void handleDeleteComment(item.id)}
                          className="text-xs rounded-full px-3 py-1 font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        >
                          حذف
                        </button>
                        <div className="text-right flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-end text-xs text-gray-400 mb-1">
                            <span>{item.courseTitle} · {item.lessonTitle}</span>
                          </div>
                          <p className="text-sm text-gray-800">{item.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.userName} · {formatDate(item.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={loadLogs}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                <Activity size={16} />
                تحديث السجل
              </button>
              <h3 className="font-bold text-gray-900 text-lg">سجل عمليات الدخول</h3>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {logsLoading ? (
                <div className="p-10 text-center text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  جاري تحميل السجل...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Activity size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>لا توجد سجلات بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">التاريخ</th>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">IP</th>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">المتصفح</th>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">الإجراء</th>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">الاسم</th>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">البريد الإلكتروني</th>
                        <th className="py-3 px-4 text-right text-gray-600 font-semibold">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logs.map((log) => {
                        const info = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-500" };
                        const isBanned = log.userId ? bannedUsers.has(log.userId) : false;
                        const browser = log.userAgent
                          ? (log.userAgent.includes("Firefox") ? "Firefox"
                            : log.userAgent.includes("Chrome") ? "Chrome"
                            : log.userAgent.includes("Safari") ? "Safari"
                            : log.userAgent.includes("Edge") ? "Edge"
                            : "متصفح")
                          : "—";
                        return (
                          <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${isBanned ? "bg-red-50/40" : ""}`}>
                            <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs font-mono">{log.ipAddress ?? "—"}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{browser}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                                {info.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">{log.firstName ?? "—"}</td>
                            <td className="py-3 px-4 text-gray-700 font-medium">{log.email}</td>
                            <td className="py-3 px-4">
                              {log.userId && (
                                <button
                                  onClick={() => void handleBanUser(log.userId)}
                                  className={`text-xs rounded-full px-3 py-1 font-semibold transition-colors ${
                                    isBanned
                                      ? "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                                      : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  {isBanned ? "رفع الحظر" : "حظر"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

type LessonCardProps = {
  lesson: LessonDraft;
  index: number;
  onUpdate: (patch: Partial<LessonDraft>) => void;
  onRemove: () => void;
  onVideoSelect: (f: File) => void;
  onPdfSelect: (f: File) => void;
  onAttachmentSelect: (f: File) => void;
};

function LessonCard({ lesson, index, onUpdate, onRemove, onVideoSelect, onPdfSelect, onAttachmentSelect }: LessonCardProps) {
  const videoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors p-1">
          <Trash2 size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">الدرس {index + 1}</span>
          {lesson.uploaded && <CheckCircle size={16} className="text-green-500" />}
          {lesson.error && <AlertCircle size={16} className="text-red-500" />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 text-right">عنوان الدرس *</label>
          <input value={lesson.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            placeholder="عنوان الدرس" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 text-right">المدة (دقيقة)</label>
          <input value={lesson.duration} type="number" min="0"
            onChange={(e) => onUpdate({ duration: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            placeholder="مثال: 15" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1 text-right">وصف الدرس</label>
          <textarea value={lesson.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white"
            placeholder="وصف مختصر لمحتوى الدرس..." />
        </div>
      </div>

      {/* Upload buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Video */}
        <div>
          <input ref={videoRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onVideoSelect(f); }} />
          <button onClick={() => videoRef.current?.click()}
            className={`w-full flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-4 transition-colors ${
              lesson.videoFile ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}>
            <Video size={20} className={lesson.videoFile ? "text-indigo-600" : "text-gray-400"} />
            <span className="text-xs font-medium text-center">{lesson.videoLabel || "رفع فيديو"}</span>
            {lesson.videoFile && (
              <span className="text-xs text-gray-400">
                {(lesson.videoFile.size / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </button>
        </div>

        {/* PDF */}
        <div>
          <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPdfSelect(f); }} />
          <button onClick={() => pdfRef.current?.click()}
            className={`w-full flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-4 transition-colors ${
              lesson.pdfFile ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
            }`}>
            <FileText size={20} className={lesson.pdfFile ? "text-green-600" : "text-gray-400"} />
            <span className="text-xs font-medium text-center">{lesson.pdfLabel || "رفع PDF"}</span>
          </button>
        </div>

        {/* Code/Attachment */}
        <div>
          <input ref={attachRef} type="file"
            accept=".zip,.rar,.txt,.js,.ts,.py,.html,.css,.json,.md"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachmentSelect(f); }} />
          <button onClick={() => attachRef.current?.click()}
            className={`w-full flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-4 transition-colors ${
              lesson.attachmentFile ? "border-amber-300 bg-amber-50" : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
            }`}>
            <Paperclip size={20} className={lesson.attachmentFile ? "text-amber-600" : "text-gray-400"} />
            <span className="text-xs font-medium text-center">{lesson.attachmentLabel || "رفع أكواد / ملفات"}</span>
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {lesson.uploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{lesson.uploadProgress}%</span>
            <span>جاري الرفع...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${lesson.uploadProgress}%` }} />
          </div>
        </div>
      )}
      {lesson.error && (
        <p className="text-xs text-red-600 text-right">{lesson.error}</p>
      )}
    </div>
  );
}
