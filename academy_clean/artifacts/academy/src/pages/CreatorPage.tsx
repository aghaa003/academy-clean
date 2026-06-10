import { useMemo, useState, useRef, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useListCourses } from "@workspace/api-client-react";
import {
  BookOpen, Plus, X, Upload, FileText, Video, Trash2,
  CheckCircle, AlertCircle, Loader2, Paperclip, ShieldCheck, MessageCircle, BarChart3, ThumbsUp
} from "lucide-react";
import { useCreateChallenge } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type LessonDraft = {
  id: string;
  title: string;
  description: string;
  videoFile: File | null;
  videoUrl: string;
  pdfFile: File | null;
  pdfUrl: string;
  attachmentFile: File | null;
  attachmentUrl: string;
  duration: string;
  order: string;
  uploadProgress: number;
  uploading: boolean;
  uploaded: boolean;
  error: string;
  videoLabel: string;
  pdfLabel: string;
  attachmentLabel: string;
};

type CreatorCourse = {
  id: number;
  title: string;
  category: string;
  description?: string;
  level: string;
  totalLessons?: number;
  totalEnrollments?: number;
};

function newLesson(): LessonDraft {
  return {
    id: Math.random().toString(36).slice(2),
    title: "", description: "",
    videoFile: null, videoUrl: "",
    pdfFile: null, pdfUrl: "",
    attachmentFile: null, attachmentUrl: "",
    duration: "", order: "", uploadProgress: 0, uploading: false, uploaded: false, error: "",
    videoLabel: "", pdfLabel: "", attachmentLabel: "",
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
        // API returns { file: { url } }; fall back to top-level url for safety
        const url: string = data?.file?.url ?? data?.url ?? "";
        if (!url) { reject(new Error("لم يُعَد URL الملف من الخادم")); return; }
        resolve(url);
      } else {
        reject(new Error("فشل رفع الملف"));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("خطأ في الاتصال")));
    xhr.open("POST", `${BASE}/api/upload`);
    xhr.send(form);
  });
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم",
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

export default function CreatorPage() {
  const { user, isLoaded } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "", description: "", category: "", level: "beginner",
  });
  const [lessons, setLessons] = useState<LessonDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [appendCourseId, setAppendCourseId] = useState<number | null>(null);
  const [appendLessons, setAppendLessons] = useState<Record<number, LessonDraft[]>>({});
  const [appendSaving, setAppendSaving] = useState<Record<number, boolean>>({});
  const [appendError, setAppendError] = useState<Record<number, string>>({});
  const [viewersByCourse, setViewersByCourse] = useState<Record<number, any[]>>({});
  const [viewersLoading, setViewersLoading] = useState<Record<number, boolean>>({});
  const [viewersError, setViewersError] = useState<Record<number, string>>({});
  const [engagementsByCourse, setEngagementsByCourse] = useState<Record<number, { likes: number; comments: any[] }>>({});
  const [engagementsLoading, setEngagementsLoading] = useState<Record<number, boolean>>({});
  const [engagementsError, setEngagementsError] = useState<Record<number, string>>({});
  const [analyticsByCourse, setAnalyticsByCourse] = useState<Record<number, { views: number; visitors: number; uniqueVisitors: number; likes: number; comments: number }>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState<Record<number, boolean>>({});
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
  const [deleteSaving, setDeleteSaving] = useState<Record<number, boolean>>({});
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [removedCourseIds, setRemovedCourseIds] = useState<number[]>([]);
  const [lessonsByCourse, setLessonsByCourse] = useState<Record<number, any[]>>({});
  const [lessonsLoading, setLessonsLoading] = useState<Record<number, boolean>>({});
  const [expandLessonManage, setExpandLessonManage] = useState<number | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Record<number, boolean>>({});
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editCourseForm, setEditCourseForm] = useState({
    title: "", description: "", category: "", level: "beginner",
  });
  const [editCourseSaving, setEditCourseSaving] = useState(false);
  const [editCourseError, setEditCourseError] = useState("");
  const videoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pdfRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const attachRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const appendVideoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const appendPdfRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const appendAttachRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: coursesData, refetch } = useListCourses({ limit: 100 });
  const createChallenge = useCreateChallenge();
  const allCourses = coursesData?.courses ?? [];

  const isCreator = user?.role === "creator" || user?.role === "employer";
  const isAdmin = user?.role === "admin";

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-400">جاري التحميل...</div>
      </div>
    );
  }

  if (!user || (!isCreator && !isAdmin)) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck size={36} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-3">صلاحيات صانع المحتوى مطلوبة</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              هذه الصفحة مخصصة لصانعي المحتوى المعتمدين. تواصل مع الإدارة للحصول على صلاحية النشر.
            </p>
            <Link href="/" className="rounded-full px-8 py-3 text-sm font-bold text-white block"
              style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
              العودة للرئيسية
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const updateLesson = (id: string, patch: Partial<LessonDraft>) => {
    setLessons((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  };

  const uploadLessonFiles = async (lesson: LessonDraft) => {
    let videoUrl = lesson.videoUrl;
    let pdfUrl = lesson.pdfUrl;
    let attachmentUrl = lesson.attachmentUrl;
    updateLesson(lesson.id, { uploading: true, uploadProgress: 0, error: "" });
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
      updateLesson(lesson.id, { uploading: false, uploaded: true, uploadProgress: 100, videoUrl, pdfUrl, attachmentUrl });
    } catch (err: any) {
      updateLesson(lesson.id, { uploading: false, error: err.message ?? "فشل الرفع" });
      throw err;
    }
    return { videoUrl, pdfUrl, attachmentUrl };
  };

  const updateAppendLesson = (courseId: number, id: string, patch: Partial<LessonDraft>) => {
    setAppendLessons((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] ?? [newLesson()]).map((l) => l.id === id ? { ...l, ...patch } : l),
    }));
  };

  const handleAppendCourse = async (courseId: number) => {
    const courseLessons = appendLessons[courseId] ?? [];
    if (courseLessons.length === 0) return;
    setAppendSaving((p) => ({ ...p, [courseId]: true }));
    setAppendError((p) => ({ ...p, [courseId]: "" }));
    try {
      for (let i = 0; i < courseLessons.length; i += 1) {
        const lesson = courseLessons[i];
        if (!lesson.title) continue;
        const files = await uploadLessonFiles(lesson);
        await apiFetch(`${BASE}/api/courses/${courseId}/lessons`, {
  method: "POST",
  body: JSON.stringify({
            title: lesson.title,
            description: lesson.description || null,
            videoUrl: files.videoUrl || null,
            pdfUrl: files.pdfUrl || null,
            attachmentUrl: files.attachmentUrl || null,
            attachmentName: lesson.attachmentFile?.name ?? null,
            duration: lesson.duration ? Number(lesson.duration) : null,
            order: lesson.order ? Number(lesson.order) : i + 1,
          }),
});
    
      }
      setAppendCourseId(null);
      setAppendLessons((p) => ({ ...p, [courseId]: [] }));
      refetch();
    } catch (err: any) {
      setAppendError((p) => ({ ...p, [courseId]: err?.message ?? "حدث خطأ أثناء استكمال الكورس" }));
    } finally {
      setAppendSaving((p) => ({ ...p, [courseId]: false }));
    }
  };

  const handleAppendVideoSelect = (courseId: number, lessonId: string, file: File) => {
    updateAppendLesson(courseId, lessonId, { videoFile: file, videoUrl: "", error: "" });
  };

  const handleAppendPdfSelect = (courseId: number, lessonId: string, file: File) => {
    updateAppendLesson(courseId, lessonId, { pdfFile: file, pdfUrl: "", error: "" });
  };

  const handleAppendAttachmentSelect = (courseId: number, lessonId: string, file: File) => {
    updateAppendLesson(courseId, lessonId, { attachmentFile: file, attachmentUrl: "", error: "" });
  };

  const loadViewers = async (courseId: number) => {
    setViewersLoading((prev) => ({ ...prev, [courseId]: true }));
    setViewersError((prev) => ({ ...prev, [courseId]: "" }));
    try {
      const res = await apiFetch(`${BASE}/api/courses/${courseId}/viewers`);
      if (!res.ok) throw new Error("تعذر تحميل المستخدمين");
      const data = await res.json();
      setViewersByCourse((prev) => ({ ...prev, [courseId]: data }));
    } catch (err: any) {
      setViewersError((prev) => ({ ...prev, [courseId]: err?.message ?? "تعذر تحميل المستخدمين" }));
    } finally {
      setViewersLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const toggleViewers = async (courseId: number) => {
    setAppendCourseId((prev) => (prev === courseId ? null : courseId));
    if (!viewersByCourse[courseId] && !viewersLoading[courseId]) {
      await loadViewers(courseId);
    }
  };

  const loadEngagements = async (courseId: number) => {
    setEngagementsLoading((prev) => ({ ...prev, [courseId]: true }));
    setEngagementsError((prev) => ({ ...prev, [courseId]: "" }));
    try {
      const courseRes = await apiFetch(`${BASE}/api/courses/${courseId}`);
      if (!courseRes.ok) throw new Error("تعذر تحميل التفاعلات");
      const courseData = await courseRes.json();
      const lessonRows = courseData.lessons ?? [];
      const details = await Promise.all(lessonRows.map(async (lesson: any) => {
        const [likesRes, commentsRes] = await Promise.all([
          apiFetch(`${BASE}/api/lessons/${lesson.id}/likes`, ),
          apiFetch(`${BASE}/api/lessons/${lesson.id}/comments`, ),
        ]);
        const likes = likesRes.ok ? await likesRes.json() : { count: 0 };
        const comments = commentsRes.ok ? await commentsRes.json() : [];
        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          likes: Number(likes.count ?? 0),
          comments,
        };
      }));
      setEngagementsByCourse((prev) => ({
        ...prev,
        [courseId]: {
          likes: details.reduce((sum, item) => sum + item.likes, 0),
          comments: details.flatMap((item) => item.comments.map((c: any) => ({ ...c, lessonTitle: item.lessonTitle }))),
        },
      }));
    } catch (err: any) {
      setEngagementsError((prev) => ({ ...prev, [courseId]: err?.message ?? "تعذر تحميل التفاعلات" }));
    } finally {
      setEngagementsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleCreate = async () => {
    if (!courseForm.title || !courseForm.category) {
      setError("العنوان والتصنيف مطلوبان");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!user?.id) throw new Error("لم يتم العثور على ملفك الشخصي");

      const courseRes = await apiFetch(`${BASE}/api/courses`, {
        method: "POST",

        body: JSON.stringify({
          title: courseForm.title,
          description: courseForm.description || courseForm.title,
          category: courseForm.category,
          level: courseForm.level,
          creatorId: user.id,
        }),
      });
      if (!courseRes.ok) throw new Error("فشل إنشاء الكورس");
      const created = await courseRes.json();

      for (const lesson of lessons) {
        if (!lesson.title) continue;
        const files = await uploadLessonFiles(lesson);
        await apiFetch(`${BASE}/api/courses/${created.id}/lessons`, {
          method: "POST",
         
          body: JSON.stringify({
            title: lesson.title,
            description: lesson.description || null,
            videoUrl: files.videoUrl || null,
            pdfUrl: files.pdfUrl || null,
            attachmentUrl: files.attachmentUrl || null,
            attachmentName: lesson.attachmentFile?.name ?? null,
            duration: lesson.duration ? Number(lesson.duration) : null,
            order: lessons.indexOf(lesson),
          }),
        });
      }

      setShowForm(false);
      setCourseForm({ title: "", description: "", category: "", level: "beginner" });
      setLessons([]);
      setSuccess("تم إنشاء الكورس بنجاح! 🎉");
      refetch();
    } catch (err: any) {
      setError(err?.message ?? "حدث خطأ أثناء إنشاء الكورس");
    } finally {
      setSaving(false);
    }
  };

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

  const loadAnalytics = async (courseId: number) => {
    setAnalyticsLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const courseRes = await apiFetch(`${BASE}/api/courses/${courseId}`,);
      if (!courseRes.ok) return;
      const courseData = await courseRes.json();
      const lessonsData = courseData.lessons ?? [];
      const [likesCounts, commentsCounts] = await Promise.all([
        Promise.all(lessonsData.map(async (lesson: any) => {
          const res = await apiFetch(`${BASE}/api/lessons/${lesson.id}/likes`, );
          return res.ok ? await res.json() : { count: 0 };
        })),
        Promise.all(lessonsData.map(async (lesson: any) => {
          const res = await apiFetch(`${BASE}/api/lessons/${lesson.id}/comments`, );
          return res.ok ? await res.json() : [];
        })),
      ]);
      const likeCount = likesCounts.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
      const commentCount = commentsCounts.reduce((sum, item) => sum + item.length, 0);
      const visitors = Number(courseData.totalEnrollments ?? 0);
      setAnalyticsByCourse((prev) => ({
        ...prev,
        [courseId]: {
          views: visitors,
          visitors,
          uniqueVisitors: visitors,
          likes: likeCount,
          comments: commentCount,
        },
      }));
    } finally {
      setAnalyticsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const myCourses = allCourses.filter((c: any) => {
    const isOwner = c.creatorId === user?.id;
    return !removedCourseIds.includes(c.id) && (isAdmin || isOwner);
  });

  const loadLessonsForCourse = async (courseId: number) => {
    setLessonsLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await apiFetch(`${BASE}/api/courses/${courseId}`, );
      if (res.ok) {
        const data = await res.json();
        setLessonsByCourse((prev) => ({ ...prev, [courseId]: data.lessons ?? [] }));
      }
    } catch {}
    finally {
      setLessonsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const toggleLessonManage = async (courseId: number) => {
    if (expandLessonManage === courseId) {
      setExpandLessonManage(null);
    } else {
      setExpandLessonManage(courseId);
      if (!lessonsByCourse[courseId]) await loadLessonsForCourse(courseId);
    }
  };

  const handleDeleteLesson = async (courseId: number, lessonId: number) => {
    if (!window.confirm("هل تريد حذف هذا الدرس نهائياً؟ سيتم حذف جميع التعليقات والإعجابات والتقدم المرتبطة به.")) return;
    setDeletingLesson((prev) => ({ ...prev, [lessonId]: true }));
    setDeleteError("");
    try {
      const res = await apiFetch(`${BASE}/api/courses/${courseId}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "فشل حذف الدرس");
      }
      setLessonsByCourse((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] ?? []).filter((l: any) => l.id !== lessonId),
      }));
      await refetch();
      setDeleteMessage("تم حذف الدرس بنجاح");
    } catch (err: any) {
      setDeleteError(err?.message ?? "حدث خطأ أثناء حذف الدرس");
    } finally {
      setDeletingLesson((prev) => ({ ...prev, [lessonId]: false }));
    }
  };

  const startEditCourse = (course: { id: number; title: string; description?: string; category: string; level: string }) => {
    setEditingCourseId(course.id);
    setEditCourseForm({
      title: course.title,
      description: course.description ?? "",
      category: course.category,
      level: course.level,
    });
    setEditCourseError("");
  };

  const handleUpdateCourse = async (courseId: number) => {
    if (!editCourseForm.title || !editCourseForm.category) {
      setEditCourseError("العنوان والتصنيف مطلوبان");
      return;
    }
    setEditCourseSaving(true);
    setEditCourseError("");
    try {
      const res = await apiFetch(`${BASE}/api/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editCourseForm.title,
          description: editCourseForm.description,
          category: editCourseForm.category,
          level: editCourseForm.level,
        }),
      });
      if (!res.ok) throw new Error("فشل تحديث الكورس");
      setEditingCourseId(null);
      await refetch();
    } catch (err: any) {
      setEditCourseError(err?.message ?? "فشل تحديث الكورس");
    } finally {
      setEditCourseSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm("هل تريد حذف هذا الكورس نهائياً؟")) return;
    setDeleteSaving((prev) => ({ ...prev, [courseId]: true }));
    setDeleteError("");
    setDeleteMessage("");
    console.debug("delete-course:start", { courseId });
    try {
      const res = await apiFetch(`${BASE}/api/courses/${courseId}`, {
        method: "DELETE",
      });
      console.debug("delete-course:response", { courseId, status: res.status });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        console.error("delete-course:failed", { courseId, status: res.status, error: data?.error });
        throw new Error(data?.error ?? "فشل حذف الكورس");
      }
      setRemovedCourseIds((prev) => [...prev, courseId]);
      await refetch();
      setDeleteMessage("تم حذف الكورس بنجاح");
    } catch (err: any) {
      console.error("delete-course:error", { courseId, error: err?.message ?? err });
      setDeleteError(err?.message ?? "حدث خطأ أثناء حذف الكورس");
    } finally {
      setDeleteSaving((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]" dir="rtl">
      <Navbar />

      <div className="py-8 px-4 text-center"
        style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3,#4c1d95)" }}>
        <h1 className="text-3xl font-extrabold text-white mb-1">لوحة صانع المحتوى</h1>
        <p className="text-indigo-200 text-sm">أنشئ وأدر كورساتك التعليمية</p>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 py-8">
        {success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-3 mb-6 text-sm">
            <CheckCircle size={18} />
            {success}
          </div>
        )}
        {challengeSuccess && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-3 mb-6 text-sm">
            <CheckCircle size={18} />
            {challengeSuccess}
          </div>
        )}
        {deleteMessage && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-3 mb-6 text-sm">
            <CheckCircle size={18} />
            {deleteMessage}
          </div>
        )}
        {deleteError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 mb-6 text-sm">
            <AlertCircle size={18} />
            {deleteError}
          </div>
        )}

        {/* Header actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">كورساتي ({myCourses.length})</h2>
          <button
            onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: showForm ? "#6b7280" : "linear-gradient(90deg,#3730a3,#7c3aed)" }}
          >
            {showForm ? <><X size={16} />إلغاء</> : <><Plus size={16} />إضافة كورس جديد</>}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowChallengeForm((p) => !p)}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}
            >
              {showChallengeForm ? "إخفاء" : "إضافة تحدي برمجي"}
            </button>
            <h3 className="text-lg font-bold text-gray-800">إدارة التحديات البرمجية</h3>
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

        {/* Course creation form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-500" />
              بيانات الكورس الجديد
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">عنوان الكورس *</label>
                <input value={courseForm.title} onChange={(e) => setCourseForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="مثال: دورة تعلم JavaScript من الصفر" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">التصنيف *</label>
                <input value={courseForm.category} onChange={(e) => setCourseForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="مثال: البرمجة، تطوير الويب" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">وصف الكورس</label>
                <textarea value={courseForm.description} onChange={(e) => setCourseForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  placeholder="اكتب وصفاً مختصراً عن ما سيتعلمه الطالب..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">المستوى</label>
                <select value={courseForm.level} onChange={(e) => setCourseForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="beginner">مبتدئ</option>
                  <option value="intermediate">متوسط</option>
                  <option value="advanced">متقدم</option>
                </select>
              </div>
            </div>

            {/* Lessons */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setLessons(p => [...p, newLesson()])}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  <Plus size={16} />إضافة درس
                </button>
                <h4 className="font-bold text-gray-700">الدروس ({lessons.length})</h4>
              </div>

              {lessons.map((lesson, idx) => (
                <div key={lesson.id} className="border border-gray-200 rounded-2xl p-4 mb-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setLessons(p => p.filter(l => l.id !== lesson.id))}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <span className="font-semibold text-gray-700 text-sm">درس {idx + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input value={lesson.title} onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="عنوان الدرس *" />
                    <input value={lesson.duration} onChange={(e) => updateLesson(lesson.id, { duration: e.target.value })}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="المدة بالثواني (مثال: 600)" type="number" min="0" />
                    <input value={lesson.description} onChange={(e) => updateLesson(lesson.id, { description: e.target.value })}
                      className="md:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="وصف الدرس (اختياري)" />
                  </div>

                  {/* File uploads */}
                  <div className="flex flex-wrap gap-2">
                    {/* Video */}
                    <div>
                      <input ref={(el) => { videoRefs.current[lesson.id] = el; }} type="file" accept="video/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && updateLesson(lesson.id, { videoFile: e.target.files[0], videoUrl: "", error: "" })} />
                      <button onClick={() => videoRefs.current[lesson.id]?.click()}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${lesson.videoFile || lesson.videoUrl ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
                        <Video size={13} />
                        {lesson.videoFile ? lesson.videoFile.name.slice(0, 20) + "..." : "رفع فيديو"}
                      </button>
                    </div>
                    {/* PDF */}
                    <div>
                      <input ref={(el) => { pdfRefs.current[lesson.id] = el; }} type="file" accept=".pdf" className="hidden"
                        onChange={(e) => e.target.files?.[0] && updateLesson(lesson.id, { pdfFile: e.target.files[0], pdfUrl: "", error: "" })} />
                      <button onClick={() => pdfRefs.current[lesson.id]?.click()}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${lesson.pdfFile ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
                        <FileText size={13} />
                        {lesson.pdfFile ? "PDF ✓" : "ملف PDF"}
                      </button>
                    </div>
                    {/* Attachment */}
                    <div>
                      <input ref={(el) => { attachRefs.current[lesson.id] = el; }} type="file" className="hidden"
                        onChange={(e) => e.target.files?.[0] && updateLesson(lesson.id, { attachmentFile: e.target.files[0], attachmentUrl: "", error: "" })} />
                      <button onClick={() => attachRefs.current[lesson.id]?.click()}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${lesson.attachmentFile ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
                        <Paperclip size={13} />
                        {lesson.attachmentFile ? "ملحق ✓" : "ملف مرفق"}
                      </button>
                    </div>
                  </div>

                  {lesson.uploading && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${lesson.uploadProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">جاري الرفع... {lesson.uploadProgress}%</p>
                    </div>
                  )}
                  {lesson.uploaded && (
                    <p className="text-xs text-green-600 mt-2 text-right flex items-center gap-1 justify-end">
                      <CheckCircle size={12} /> تم الرفع بنجاح
                    </p>
                  )}
                  {lesson.error && (
                    <p className="text-xs text-red-500 mt-2 text-right flex items-center gap-1 justify-end">
                      <AlertCircle size={12} /> {lesson.error}
                    </p>
                  )}
                </div>
              ))}

              {lessons.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
                  اضغط "إضافة درس" لإضافة دروس للكورس
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mt-4 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button onClick={handleCreate} disabled={saving || !courseForm.title || !courseForm.category}
                className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                {saving ? <><Loader2 size={16} className="animate-spin" />جاري الحفظ...</> : "نشر الكورس"}
              </button>
            </div>
          </div>
        )}

        {/* My courses list */}
        {myCourses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">لم تنشر أي كورس بعد</p>
            <p className="text-gray-400 text-sm mt-1">اضغط على "إضافة كورس جديد" للبدء</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myCourses.map((course: any) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                {editingCourseId === course.id ? (
                  <div className="space-y-3">
                    <input value={editCourseForm.title} onChange={(e) => setEditCourseForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right" placeholder="عنوان الكورس" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={editCourseForm.category} onChange={(e) => setEditCourseForm((p) => ({ ...p, category: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right" placeholder="التصنيف" />
                      <select value={editCourseForm.level} onChange={(e) => setEditCourseForm((p) => ({ ...p, level: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right bg-white">
                        <option value="beginner">مبتدئ</option>
                        <option value="intermediate">متوسط</option>
                        <option value="advanced">متقدم</option>
                      </select>
                    </div>
                    <textarea value={editCourseForm.description} onChange={(e) => setEditCourseForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right resize-none" placeholder="وصف الكورس" />
                    {editCourseError && <div className="text-xs text-red-600">{editCourseError}</div>}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateCourse(course.id)} disabled={editCourseSaving}
                        className="flex-1 rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                        {editCourseSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </button>
                      <button onClick={() => setEditingCourseId(null)} disabled={editCourseSaving}
                        className="flex-1 rounded-full px-4 py-2 text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">{course.title}</h3>
                        <p className="text-gray-500 text-xs mt-1">{course.category} · {LEVEL_LABELS[course.level] ?? course.level}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2.5 py-1">
                          {course.totalLessons} درس
                        </span>
                        <button onClick={() => startEditCourse(course)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-full px-2.5 py-1">
                          تعديل
                        </button>
                      </div>
                    </div>
                    {course.description && (
                      <p className="text-gray-500 text-sm mt-2 line-clamp-2">{course.description}</p>
                    )}
                  </>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <Link href={`/courses/${course.id}`}
                    className="text-indigo-500 font-semibold hover:underline">
                    عرض الكورس ←
                  </Link>
                  <span>{course.totalEnrollments} طالب</span>
                </div>
                <button
                  onClick={() => toggleViewers(course.id)}
                  className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 w-full text-right"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-gray-800">المستخدمون الذين شاهدوا الكورس</h4>
                    <span className="text-xs text-gray-400">{viewersLoading[course.id] ? "جاري التحميل..." : `${(viewersByCourse[course.id] ?? []).length} مستخدم`}</span>
                  </div>
                  {viewersError[course.id] ? (
                    <p className="text-xs text-red-500">{viewersError[course.id]}</p>
                  ) : (viewersByCourse[course.id] ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">لا يوجد مشاهدون بعد</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(viewersByCourse[course.id] ?? []).map((viewer: any) => (
                        <div key={viewer.userId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-gray-100 text-xs">
                          <span className="font-semibold text-gray-700">{viewer.userName}</span>
                          <span className="text-gray-400">{viewer.completedLessons}/{course.totalLessons} مكتمل</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => loadEngagements(course.id)}
                  className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 w-full text-right"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-gray-800">الإعجابات والتعليقات</h4>
                    <span className="text-xs text-gray-400">
                      {engagementsLoading[course.id] ? "جاري التحميل..." : `${engagementsByCourse[course.id]?.likes ?? 0} إعجاب`}
                    </span>
                  </div>
                  {engagementsError[course.id] ? (
                    <p className="text-xs text-red-500">{engagementsError[course.id]}</p>
                  ) : (engagementsByCourse[course.id]?.comments ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">لا توجد تعليقات بعد</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {engagementsByCourse[course.id]?.comments.slice(0, 3).map((comment: any) => (
                        <div key={comment.id} className="rounded-xl bg-white px-3 py-2 border border-gray-100 text-xs">
                          <div className="font-semibold text-gray-700">{comment.userName}</div>
                          <div className="text-gray-400 mt-1">{comment.lessonTitle}</div>
                          <div className="text-gray-600 mt-1">"{comment.content}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => loadAnalytics(course.id)}
                  className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 w-full text-right"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-gray-800">Course Analytics</h4>
                    <span className="text-xs text-gray-400">{analyticsLoading[course.id] ? "جاري التحميل..." : "عرض"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Views: {analyticsByCourse[course.id]?.views ?? 0}</div>
                    <div>Visitors: {analyticsByCourse[course.id]?.visitors ?? 0}</div>
                    <div>Unique: {analyticsByCourse[course.id]?.uniqueVisitors ?? 0}</div>
                    <div>Likes: {analyticsByCourse[course.id]?.likes ?? 0}</div>
                    <div>Comments: {analyticsByCourse[course.id]?.comments ?? 0}</div>
                  </div>
                </button>
                <button
                  onClick={() => setAppendCourseId((p) => (p === course.id ? null : course.id))}
                  className="mt-3 w-full rounded-full px-4 py-2 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(90deg,#8b5cf6,#c084fc)" }}
                >
                  استكمال الكورس
                </button>

                {/* Lesson Management */}
                <button
                  onClick={() => toggleLessonManage(course.id)}
                  className="mt-3 w-full rounded-full px-4 py-2 text-sm font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  {expandLessonManage === course.id ? "إخفاء إدارة الدروس" : "إدارة الدروس وحذفها"}
                </button>

                {expandLessonManage === course.id && (
                  <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <h4 className="text-sm font-bold text-gray-800 text-right mb-3 flex items-center gap-2 justify-end">
                      <BookOpen size={14} className="text-indigo-500" />
                      الدروس ({(lessonsByCourse[course.id] ?? []).length})
                    </h4>
                    {lessonsLoading[course.id] ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-gray-400 text-sm">
                        <Loader2 size={16} className="animate-spin" />
                        جاري التحميل...
                      </div>
                    ) : (lessonsByCourse[course.id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 text-right">لا توجد دروس في هذا الكورس</p>
                    ) : (
                      <div className="space-y-2">
                        {(lessonsByCourse[course.id] ?? []).map((lesson: any, idx: number) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2.5"
                          >
                            <button
                              onClick={() => handleDeleteLesson(course.id, lesson.id)}
                              disabled={!!deletingLesson[lesson.id]}
                              className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors p-1 rounded-lg hover:bg-red-50"
                              title="حذف الدرس"
                            >
                              {deletingLesson[lesson.id]
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                            <div className="flex-1 text-right min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{lesson.title}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                درس {idx + 1}
                                {lesson.duration ? ` · ${Math.round(lesson.duration / 60)} دقيقة` : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  disabled={!!deleteSaving[course.id]}
                  className="mt-3 w-full rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(90deg,#ef4444,#f97316)" }}
                >
                  {deleteSaving[course.id] ? "جاري الحذف..." : "حذف الكورس"}
                </button>
                {appendCourseId === course.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setAppendLessons((p) => ({ ...p, [course.id]: [...(p[course.id] ?? []), newLesson()] }))}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        إضافة درس
                      </button>
                      <div className="font-bold text-gray-800">الدروس {(appendLessons[course.id] ?? [newLesson()]).length}</div>
                    </div>
                    {(appendLessons[course.id] ?? [newLesson()]).map((lesson, idx) => (
                      <div key={lesson.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <button onClick={() => setAppendLessons((p) => ({ ...p, [course.id]: (p[course.id] ?? []).filter((l) => l.id !== lesson.id) }))} className="text-red-500 text-sm">
                            حذف
                          </button>
                          <div className="font-semibold text-gray-700">الدرس {idx + 1}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input value={lesson.title} onChange={(e) => updateAppendLesson(course.id, lesson.id, { title: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right" placeholder="عنوان الدرس" />
                          <input value={lesson.duration} onChange={(e) => updateAppendLesson(course.id, lesson.id, { duration: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right" placeholder="المدة" />
                          <input value={lesson.order} onChange={(e) => updateAppendLesson(course.id, lesson.id, { order: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right" placeholder="الترتيب" type="number" min="1" />
                        </div>
                        <textarea value={lesson.description} onChange={(e) => updateAppendLesson(course.id, lesson.id, { description: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right resize-none" rows={2} placeholder="وصف مختصر..." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <button onClick={() => appendVideoRefs.current[`${course.id}-${lesson.id}`]?.click()}
                            className={`rounded-2xl border-2 border-dashed px-4 py-5 text-sm font-medium ${lesson.videoFile ? "border-indigo-300 bg-indigo-50" : "border-gray-300 bg-white"}`}>
                            {lesson.videoLabel || "رفع فيديو"}
                          </button>
                          <button onClick={() => appendPdfRefs.current[`${course.id}-${lesson.id}`]?.click()}
                            className={`rounded-2xl border-2 border-dashed px-4 py-5 text-sm font-medium ${lesson.pdfFile ? "border-green-300 bg-green-50" : "border-gray-300 bg-white"}`}>
                            {lesson.pdfLabel || "رفع PDF"}
                          </button>
                          <button onClick={() => appendAttachRefs.current[`${course.id}-${lesson.id}`]?.click()}
                            className={`rounded-2xl border-2 border-dashed px-4 py-5 text-sm font-medium ${lesson.attachmentFile ? "border-amber-300 bg-amber-50" : "border-gray-300 bg-white"}`}>
                            {lesson.attachmentLabel || "رفع ملفات"}
                          </button>
                        </div>
                        <input ref={(el) => { appendVideoRefs.current[`${course.id}-${lesson.id}`] = el; }} type="file" accept="video/*" className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleAppendVideoSelect(course.id, lesson.id, e.target.files[0])} />
                        <input ref={(el) => { appendPdfRefs.current[`${course.id}-${lesson.id}`] = el; }} type="file" accept="application/pdf" className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleAppendPdfSelect(course.id, lesson.id, e.target.files[0])} />
                        <input ref={(el) => { appendAttachRefs.current[`${course.id}-${lesson.id}`] = el; }} type="file" className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleAppendAttachmentSelect(course.id, lesson.id, e.target.files[0])} />
                      </div>
                    ))}
                    {appendError[course.id] && <div className="text-xs text-red-600">{appendError[course.id]}</div>}
                    <button onClick={() => handleAppendCourse(course.id)} disabled={(appendLessons[course.id] ?? []).length === 0 || !!appendSaving[course.id]}
                      className="rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(90deg,#8b5cf6,#c084fc)" }}>
                      {appendSaving[course.id] ? "جاري الحفظ..." : "حفظ الكورس"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
