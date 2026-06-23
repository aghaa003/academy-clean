import { useEffect, useMemo, useState, useRef } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import {
  useListUsers,
  useListCourses,
  useListChallenges,
  useCreateCourse,
  useUpdateUser,
  useGetPlatformStats,
} from "@workspace/api-client-react";
import {
  Users, BookOpen, ShieldCheck, Plus, X, Pencil, ChevronDown,
  BarChart2, Trophy, Activity, Upload, FileText, Video,
  Trash2, CheckCircle, AlertCircle, Loader2, Paperclip, MessageCircle, ThumbsUp
} from "lucide-react";
import { useCreateChallenge } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pager } from "@/components/Pager";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AdminTab = "overview" | "users" | "courses" | "assignments" | "challenges" | "projects" | "examples" | "community" | "engagement" | "activity";

type AssignmentItem = {
  id: number;
  course_id: number;
  title: string;
  question: string;
  description: string | null;
  requirements: string | null;
  help_text: string | null;
  difficulty: number;
  language: string | null;
  assignment_order: number;
  points: number;
  is_active: boolean;
  due_date: string | null;
};

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
  if (onProgress) onProgress(10);
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await apiFetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("فشل رفع الملف");
    if (onProgress) onProgress(100);
    const data = await res.json();
    return data.file?.url ?? data.url ?? "";
  } catch {
    throw new Error("فشل رفع الملف");
  }
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

  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(null);
  const [editChallengeForm, setEditChallengeForm] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    category: "",
    points: "10",
  });
  const [editChallengeSaving, setEditChallengeSaving] = useState(false);
  const [editChallengeError, setEditChallengeError] = useState("");

  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [engagements, setEngagements] = useState<EngagementItem[]>([]);
  const [engagementsLoading, setEngagementsLoading] = useState(false);
  const [comments, setComments] = useState<CommentModeration[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSearch, setCommentSearch] = useState("");
  const [userChallengeSearch, setUserChallengeSearch] = useState("");
  const [userAssignmentSearch, setUserAssignmentSearch] = useState("");
  const [reviews, setReviews] = useState<ReviewModeration[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState("");

  // Admin user-detail modal (profile + challenge/assignment answers & scores)
  type AdminUserDetail = {
    user: { id: string; name: string; username: string; email: string; role: string; points: number; bio?: string | null; country?: string | null; phone?: string | null; banned?: boolean; disabled?: boolean };
    courses: { id: number; title: string; progress: number }[];
    challenges: { id: number; title: string; success: boolean; score: number; submitted_code: string | null; language?: string }[];
    assignments: { submission_id: number; id: number; title: string; solution: string | null; score: number; status: string; is_completed: boolean }[];
  };
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [confirmUserAction, setConfirmUserAction] = useState<{ type: "delete" | "permanent"; userId: string } | null>(null);
  const [confirmActionLoading, setConfirmActionLoading] = useState(false);

  // Generic confirm dialog for one-off destructive content actions (challenge/course/
  // solution/submission/assignment delete) — replaces native window.confirm() popups.
  const [genericConfirm, setGenericConfirm] = useState<{ title: string; description: string; onConfirm: () => Promise<void> | void } | null>(null);
  const [genericConfirmLoading, setGenericConfirmLoading] = useState(false);
  const runGenericConfirm = async () => {
    if (!genericConfirm) return;
    setGenericConfirmLoading(true);
    try {
      await genericConfirm.onConfirm();
    } finally {
      setGenericConfirmLoading(false);
      setGenericConfirm(null);
    }
  };

  // Projects tab (admin/employer CRUD for project briefs — mirrors ProjectsPage's own admin form)
  type AdminProjectItem = { id: number; track: string; title: string; description: string | null; difficulty: number; tags: string[]; category: string | null; is_active?: boolean };
  const [adminProjects, setAdminProjects] = useState<AdminProjectItem[]>([]);
  const [adminProjectsLoading, setAdminProjectsLoading] = useState(false);
  const [adminProjectsLoaded, setAdminProjectsLoaded] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ track: "basics", title: "", description: "", difficulty: "2", tags: "", category: "" });
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [projectDeleteLoading, setProjectDeleteLoading] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({ track: "basics", title: "", description: "", difficulty: "2", tags: "", category: "" });
  const [editProjectSaving, setEditProjectSaving] = useState(false);
  const [editProjectError, setEditProjectError] = useState("");

  // Examples tab (admin/employer CRUD for code examples — mirrors ExamplesPage's own admin form)
  type AdminExampleItem = { id: number; title: string; description: string | null; category: string; code: string; install_command: string | null; technologies: string[] | null; is_active?: boolean };
  const [adminExamples, setAdminExamples] = useState<AdminExampleItem[]>([]);
  const [adminExamplesLoading, setAdminExamplesLoading] = useState(false);
  const [adminExamplesLoaded, setAdminExamplesLoaded] = useState(false);
  const [exampleSearch, setExampleSearch] = useState("");
  const [showExampleForm, setShowExampleForm] = useState(false);
  const [exampleForm, setExampleForm] = useState({ title: "", description: "", category: "Frontend", code: "", install_command: "", technologies: "" });
  const [exampleSaving, setExampleSaving] = useState(false);
  const [exampleError, setExampleError] = useState("");
  const [exampleToDelete, setExampleToDelete] = useState<number | null>(null);
  const [exampleDeleteLoading, setExampleDeleteLoading] = useState(false);
  const [editingExampleId, setEditingExampleId] = useState<number | null>(null);
  const [editExampleForm, setEditExampleForm] = useState({ title: "", description: "", category: "Frontend", code: "", install_command: "", technologies: "" });
  const [editExampleSaving, setEditExampleSaving] = useState(false);
  const [editExampleError, setEditExampleError] = useState("");

  // Community posts tab (admin/employer moderation — list/delete any post)
  type AdminCommunityPost = { id: number; title: string; body?: string; content?: string; category: string | null; authorName: string; commentsCount: number; likesCount: number };
  const [communityPosts, setCommunityPosts] = useState<AdminCommunityPost[]>([]);
  const [communityPostsLoading, setCommunityPostsLoading] = useState(false);
  const [communityPostsLoaded, setCommunityPostsLoaded] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityPostToDelete, setCommunityPostToDelete] = useState<number | null>(null);
  const [communityDeleteLoading, setCommunityDeleteLoading] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    course_id: "", title: "", question: "", description: "", requirements: "", help_text: "",
    difficulty: "1", language: "", points: "10", assignment_order: "1", is_active: true,
  });
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    course_id: "", title: "", question: "", description: "", requirements: "", help_text: "",
    difficulty: "1", language: "", points: "10", assignment_order: "1", is_active: true,
  });
  const [editAssignmentSaving, setEditAssignmentSaving] = useState(false);
  const [editAssignmentError, setEditAssignmentError] = useState("");

  const { data: usersData, refetch: refetchUsers } = useListUsers({ limit: 200 });
  // /api/users is admin-only (403 for employer), so usersData stays undefined for
  // employers — fall back to the always-accessible platform-wide stats endpoint
  // instead of silently showing "0 مستخدم".
  const { data: platformStats } = useGetPlatformStats();
  // include_inactive=1 so admin sees disabled courses/challenges too — otherwise
  // toggling one inactive makes it vanish from this page with no way to re-enable it.
  const { data: coursesData, refetch: refetchCourses } = useListCourses({ include_inactive: 1 } as any);
  const { data: challengesData, refetch: refetchChallenges } = useListChallenges({ limit: 100, include_inactive: 1 } as any);

  const createCourse = useCreateCourse();
  const createChallenge = useCreateChallenge();
  const updateUser = useUpdateUser();

  const users = usersData?.users ?? [];
  const courses = coursesData?.courses ?? [];
  const challenges = challengesData?.challenges ?? [];
  const creators = users.filter((u) => u.role === "creator" || u.role === "admin");

  // Search filters for the admin management lists (client-side over loaded data).
  const [userSearch, setUserSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [challengeSearch, setChallengeSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const matches = (q: string, ...fields: (string | null | undefined)[]) =>
    q.trim() === "" || fields.some((f) => (f ?? "").toLowerCase().includes(q.trim().toLowerCase()));
  const filteredUsers = users.filter((u: any) => matches(userSearch, u.name, u.username, u.email));
  const filteredCourses = courses.filter((c: any) => matches(courseSearch, c.title, c.category));
  const filteredChallenges = challenges.filter((c: any) => matches(challengeSearch, c.title, c.category));
  const filteredAssignments = assignments.filter((a: any) => matches(assignmentSearch, a.title, a.language));
  const totalLessons = courses.reduce((sum, course: any) => sum + (course.totalLessons ?? 0), 0);

  // Pagination over the large admin lists — rendering all 100-200 rows at once
  // was causing the page to hang; slice to a page at a time instead.
  const PAGE_SIZE = 20;
  const [usersPage, setUsersPage] = useState(1);
  const [challengesPage, setChallengesPage] = useState(1);
  useEffect(() => { setUsersPage(1); }, [userSearch]);
  useEffect(() => { setChallengesPage(1); }, [challengeSearch]);
  const usersPageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const challengesPageCount = Math.max(1, Math.ceil(filteredChallenges.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);
  const pagedChallenges = filteredChallenges.slice((challengesPage - 1) * PAGE_SIZE, challengesPage * PAGE_SIZE);

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
      refetchChallenges();
    } catch (err: any) {
      setChallengeError(err?.message ?? "فشل إنشاء التحدي");
    } finally {
      setChallengeSaving(false);
    }
  };

  const startEditChallenge = (c: { id: number; title: string; description: string; difficulty: string; category: string; points: number }) => {
    setEditingChallengeId(c.id);
    setEditChallengeForm({
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      category: c.category,
      points: String(c.points),
    });
    setEditChallengeError("");
  };

  const handleUpdateChallenge = async () => {
    if (editingChallengeId === null) return;
    if (!editChallengeForm.title || !editChallengeForm.description) {
      setEditChallengeError("العنوان والوصف مطلوبان");
      return;
    }
    setEditChallengeSaving(true);
    setEditChallengeError("");
    try {
      const res = await apiFetch(`/api/challenges/${editingChallengeId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editChallengeForm.title,
          description: editChallengeForm.description,
          difficulty: editChallengeForm.difficulty,
          category: editChallengeForm.category,
          points: Number(editChallengeForm.points) || 0,
        }),
      });
      if (!res.ok) throw new Error("فشل تحديث التحدي");
      setEditingChallengeId(null);
      refetchChallenges();
    } catch (err: any) {
      setEditChallengeError(err?.message ?? "فشل تحديث التحدي");
    } finally {
      setEditChallengeSaving(false);
    }
  };

  const handleDeleteChallenge = (challengeId: number) => {
    setGenericConfirm({
      title: "حذف هذا التحدي؟",
      description: "هل تريد حذف هذا التحدي نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/challenges/${challengeId}`, { method: "DELETE" });
          if (!res.ok) throw new Error("فشل حذف التحدي");
          if (editingChallengeId === challengeId) setEditingChallengeId(null);
          refetchChallenges();
        } catch {
          setChallengeError("حدث خطأ أثناء حذف التحدي");
        }
      },
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-400">جاري التحميل...</div>
      </div>
    );
  }

  // Admins and employers can enter. Only admins get user-affecting powers
  // (ban / disable / role / score / password) — gated by `isAdmin` below.
  if (user?.role !== "admin" && user?.role !== "employer") {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          غير مصرح — هذه الصفحة للمسؤولين والمشرفين فقط.
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  const updateLesson = (id: string, patch: Partial<LessonDraft>) => {
    setLessons((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  };

  const updateAppendLesson = (courseId: number, id: string, patch: Partial<LessonDraft>) => {
    setAppendLessons((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const handleSetRole = async (userId: string, role: "user" | "creator" | "employer" | "admin") => {
    const res = await apiFetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "تعذّر تغيير الدور");
      return;
    }
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
const res = await apiFetch(`/api/courses/${courseId}/lessons`, {
  method: "POST",
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

  const handleDeleteCourse = (courseId: number) => {
    setGenericConfirm({
      title: "حذف هذا الكورس؟",
      description: "هل تريد حذف هذا الكورس نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`${BASE}/api/courses/${courseId}`, { method: "DELETE" });
          if (!res.ok) throw new Error("delete failed");
          refetchCourses();
        } catch {
          setCourseError("حدث خطأ أثناء حذف الكورس");
        }
      },
    });
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
const res = await apiFetch("/api/admin/logs");      if (!res.ok) throw new Error("failed");
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
const res = await apiFetch("/api/admin/engagements");
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
const res = await apiFetch("/api/admin/comments");
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
const res = await apiFetch("/api/admin/reviews");
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
const res = await apiFetch(`/api/admin/reviews/${reviewId}/approve`, {
  method: "POST",
});      if (res.ok) setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, status: "approved" } : r));
    } catch { /* silent */ }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
const res = await apiFetch(`/api/admin/reviews/${reviewId}/reject`, {
  method: "POST",
});      if (res.ok) setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, status: "rejected" } : r));
    } catch { /* silent */ }
  };

  const handleDeleteComment = async (commentId: string, commentType?: "lesson" | "community") => {
    try {
      // Lesson and community comments have independent ids that collide in the
      // merged list — the type-aware route avoids deleting the wrong row when two
      // comments from different sources share the same numeric id.
      const url = commentType
        ? `/api/admin/comments/${commentType}/${commentId}`
        : `/api/admin/comments/${commentId}`;
      const res = await apiFetch(url, { method: "DELETE" });
      if (res.ok) setComments((prev) => prev.filter((c) => !(c.id === commentId && (c as any).type === commentType)));
    } catch { /* silent */ }
  };

  const handleBanUser = async (userId: string | null) => {
    if (!userId) return;
    try {
      const current = users.find((u: any) => u.id === userId);
      const isBanned = !!current?.banned;
      const res = await apiFetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ banned: !isBanned }),
      });
      if (res.ok) {
        // Reflect the server's persisted state, not a client-only flag that
        // resets on reload — the table must show who is actually banned.
        refetchUsers();
      }
    } catch { /* silent */ }
  };

  // Admin-only: set a new score (points) for a user.
  const handleSetScore = async (userId: string, current: number) => {
    const input = prompt("النقاط الجديدة:", String(current));
    if (input === null) return;
    const points = parseInt(input, 10);
    if (Number.isNaN(points) || points < 0) return;
    const res = await apiFetch(`/api/admin/users/${userId}/score`, {
      method: "POST",
      body: JSON.stringify({ points }),
    });
    if (res.ok) refetchUsers();
  };

  // Admin-only: reset a user's password.
  const handleSetPassword = async (userId: string) => {
    const password = prompt("كلمة المرور الجديدة (8 أحرف على الأقل):");
    if (!password) return;
    if (password.length < 8) { alert("كلمة المرور يجب أن تكون 8 أحرف على الأقل."); return; }
    const res = await apiFetch(`/api/admin/users/${userId}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    alert(res.ok ? "تم تحديث كلمة المرور" : "فشل تحديث كلمة المرور");
  };

  // Admin-only: disable / enable a user account.
  const handleToggleDisable = async (userId: string, disabled: boolean) => {
    const res = await apiFetch(`/api/admin/users/${userId}/disable`, {
      method: "POST",
      body: JSON.stringify({ disabled: !disabled }),
    });
    if (res.ok) refetchUsers();
  };

  // Admin-only: soft-delete a user (they can't log in again) — confirmed via modal below.
  const performDeleteUser = async (userId: string) => {
    const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) refetchUsers();
    else { const d = await res.json().catch(() => ({})); alert(d?.error ?? "تعذّر الحذف"); }
  };

  // Admin-only: irreversibly erase an already soft-deleted user — confirmed via modal below.
  const performPermanentDeleteUser = async (userId: string) => {
    const res = await apiFetch(`/api/admin/users/${userId}/permanent`, { method: "DELETE" });
    if (res.ok) refetchUsers();
    else { const d = await res.json().catch(() => ({})); alert(d?.error ?? "تعذّر الحذف النهائي"); }
  };

  const handleDeleteUser = (userId: string) => setConfirmUserAction({ type: "delete", userId });
  const handlePermanentDeleteUser = (userId: string) => setConfirmUserAction({ type: "permanent", userId });

  const runConfirmedUserAction = async () => {
    if (!confirmUserAction) return;
    setConfirmActionLoading(true);
    try {
      if (confirmUserAction.type === "delete") await performDeleteUser(confirmUserAction.userId);
      else await performPermanentDeleteUser(confirmUserAction.userId);
    } finally {
      setConfirmActionLoading(false);
      setConfirmUserAction(null);
    }
  };

  // Admin-only: restore a mistakenly-deleted user.
  const handleRestoreUser = async (userId: string) => {
    const res = await apiFetch(`/api/admin/users/${userId}/restore`, { method: "POST" });
    if (res.ok) refetchUsers();
  };

  // Toggle active/disabled state for content (course/challenge/assignment/project).
  const toggleContentActive = async (kind: "courses" | "challenges" | "assignments" | "projects" | "examples", id: number, after?: () => void) => {
    const res = await apiFetch(`/api/${kind}/${id}/toggle-active`, { method: "POST" });
    if (res.ok && after) after();
    else if (!res.ok) alert("تعذّر تغيير الحالة (تحقق من الصلاحية)");
  };

  // Admin-only: open the full user detail (profile + challenge/assignment answers & scores).
  const openUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    setUserDetail(null);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`);
      if (res.ok) setUserDetail(await res.json());
    } catch { /* silent */ }
    finally { setUserDetailLoading(false); }
  };

  const gradeChallenge = async (userId: string, challengeId: number, score: number) => {
    const res = await apiFetch(`/api/admin/users/${userId}/challenges/${challengeId}/grade`, {
      method: "POST", body: JSON.stringify({ score }),
    });
    if (res.ok) { openUserDetail(userId); refetchUsers(); }
  };

  const gradeAssignment = async (userId: string, submissionId: number, score: number) => {
    const res = await apiFetch(`/api/admin/assignment-submissions/${submissionId}/grade`, {
      method: "POST", body: JSON.stringify({ score }),
    });
    if (res.ok) openUserDetail(userId);
  };

  const deleteChallengeSubmissionAdmin = (userId: string, submissionId: number) => {
    setGenericConfirm({
      title: "حذف هذا الحل؟",
      description: "سيتم حذف حل هذا التحدي نهائياً.",
      onConfirm: async () => {
        const res = await apiFetch(`/api/admin/challenge-submissions/${submissionId}`, { method: "DELETE" });
        if (res.ok) openUserDetail(userId);
      },
    });
  };

  const deleteAssignmentSubmissionAdmin = (userId: string, submissionId: number) => {
    setGenericConfirm({
      title: "حذف هذا التسليم؟",
      description: "سيتم حذف تسليم هذا التكليف نهائياً.",
      onConfirm: async () => {
        const res = await apiFetch(`/api/admin/assignment-submissions/${submissionId}`, { method: "DELETE" });
        if (res.ok) openUserDetail(userId);
      },
    });
  };

  const loadAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const res = await apiFetch("/api/admin/assignments");
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { assignments?: AssignmentItem[] };
      setAssignments(data.assignments ?? []);
      setAssignmentsLoaded(true);
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    setAssignmentSaving(true);
    setAssignmentError("");
    try {
      const res = await apiFetch("/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          course_id: Number(assignmentForm.course_id),
          title: assignmentForm.title,
          question: assignmentForm.question,
          description: assignmentForm.description || null,
          requirements: assignmentForm.requirements || null,
          help_text: assignmentForm.help_text || null,
          difficulty: Number(assignmentForm.difficulty),
          language: assignmentForm.language || null,
          assignment_order: Number(assignmentForm.assignment_order) || 1,
          points: Number(assignmentForm.points) || 0,
          is_active: assignmentForm.is_active,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "فشل إنشاء التكليف");
      }
      const created = await res.json() as AssignmentItem;
      setAssignments((prev) => [created, ...prev]);
      setShowAssignmentForm(false);
      setAssignmentForm({
        course_id: "", title: "", question: "", description: "", requirements: "", help_text: "",
        difficulty: "1", language: "", points: "10", assignment_order: "1", is_active: true,
      });
    } catch (e: any) {
      setAssignmentError(e?.message ?? "فشل إنشاء التكليف");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const startEditAssignment = (a: AssignmentItem) => {
    setEditingAssignmentId(a.id);
    setEditAssignmentForm({
      course_id: String(a.course_id),
      title: a.title,
      question: a.question,
      description: a.description ?? "",
      requirements: a.requirements ?? "",
      help_text: a.help_text ?? "",
      difficulty: String(a.difficulty ?? 1),
      language: a.language ?? "",
      points: String(a.points ?? 0),
      assignment_order: String(a.assignment_order ?? 1),
      is_active: a.is_active,
    });
    setEditAssignmentError("");
  };

  const handleUpdateAssignment = async () => {
    if (editingAssignmentId == null) return;
    setEditAssignmentSaving(true);
    setEditAssignmentError("");
    try {
      const res = await apiFetch(`/api/assignments/${editingAssignmentId}`, {
        method: "PUT",
        body: JSON.stringify({
          course_id: Number(editAssignmentForm.course_id),
          title: editAssignmentForm.title,
          question: editAssignmentForm.question,
          description: editAssignmentForm.description || null,
          requirements: editAssignmentForm.requirements || null,
          help_text: editAssignmentForm.help_text || null,
          difficulty: Number(editAssignmentForm.difficulty),
          language: editAssignmentForm.language || null,
          assignment_order: Number(editAssignmentForm.assignment_order) || 1,
          points: Number(editAssignmentForm.points) || 0,
          is_active: editAssignmentForm.is_active,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "فشل تحديث التكليف");
      }
      const updated = await res.json() as AssignmentItem;
      setAssignments((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      setEditingAssignmentId(null);
    } catch (e: any) {
      setEditAssignmentError(e?.message ?? "فشل تحديث التكليف");
    } finally {
      setEditAssignmentSaving(false);
    }
  };

  const handleDeleteAssignment = (id: number) => {
    setGenericConfirm({
      title: "حذف هذا التكليف؟",
      description: "هل أنت متأكد من حذف هذا التكليف؟ لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
          if (res.ok) setAssignments((prev) => prev.filter((a) => a.id !== id));
        } catch { /* silent */ }
      },
    });
  };

  // ── Projects tab ─────────────────────────────────────────────────────────
  const loadAdminProjects = async () => {
    setAdminProjectsLoading(true);
    try {
      const res = await apiFetch("/api/projects?include_inactive=1");
      const data = res.ok ? await res.json() : { projects: [] };
      setAdminProjects(Array.isArray(data?.projects) ? data.projects : []);
    } catch {
      setAdminProjects([]);
    } finally {
      setAdminProjectsLoading(false);
      setAdminProjectsLoaded(true);
    }
  };

  const filteredAdminProjects = adminProjects.filter((p) => matches(projectSearch, p.title, p.category));

  const handleCreateProject = async () => {
    if (!projectForm.title.trim() || projectSaving) return;
    setProjectSaving(true);
    setProjectError("");
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          track: projectForm.track,
          title: projectForm.title.trim(),
          // Backend ProjectController::store validates "desc", not "description"
          // (the edit path below already uses "desc" correctly) — using the wrong
          // key here silently dropped every newly-created project's description.
          desc: projectForm.description.trim() || null,
          difficulty: Number(projectForm.difficulty) || 1,
          tags: projectForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          category: projectForm.category.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "فشل إنشاء المشروع");
      }
      setProjectForm({ track: "basics", title: "", description: "", difficulty: "2", tags: "", category: "" });
      setShowProjectForm(false);
      loadAdminProjects();
    } catch (e: any) {
      setProjectError(e?.message ?? "فشل إنشاء المشروع");
    } finally {
      setProjectSaving(false);
    }
  };

  const handleDeleteProject = (id: number) => setProjectToDelete(id);

  const confirmDeleteProject = async () => {
    if (projectToDelete == null) return;
    setProjectDeleteLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectToDelete}`, { method: "DELETE" });
      if (res.ok) setAdminProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
    } finally {
      setProjectDeleteLoading(false);
      setProjectToDelete(null);
    }
  };

  const startEditProject = (p: AdminProjectItem) => {
    setEditingProjectId(p.id);
    setEditProjectForm({
      track: p.track, title: p.title, description: p.description ?? "",
      difficulty: String(p.difficulty ?? 2), tags: (p.tags ?? []).join(", "), category: p.category ?? "",
    });
    setEditProjectError("");
  };

  const handleUpdateProject = async () => {
    if (editingProjectId == null) return;
    setEditProjectSaving(true);
    setEditProjectError("");
    try {
      const res = await apiFetch(`/api/projects/${editingProjectId}`, {
        method: "PUT",
        body: JSON.stringify({
          track: editProjectForm.track,
          title: editProjectForm.title,
          desc: editProjectForm.description || null,
          difficulty: Number(editProjectForm.difficulty) || 1,
          tags: editProjectForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          category: editProjectForm.category || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "فشل تحديث المشروع");
      }
      const updated = await res.json() as AdminProjectItem;
      setAdminProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProjectId(null);
    } catch (e: any) {
      setEditProjectError(e?.message ?? "فشل تحديث المشروع");
    } finally {
      setEditProjectSaving(false);
    }
  };

  // ── Examples tab ─────────────────────────────────────────────────────────
  const loadAdminExamples = async () => {
    setAdminExamplesLoading(true);
    try {
      const res = await apiFetch("/api/examples?include_inactive=1");
      const data = res.ok ? await res.json() : { examples: [] };
      setAdminExamples(Array.isArray(data?.examples) ? data.examples : []);
    } catch {
      setAdminExamples([]);
    } finally {
      setAdminExamplesLoading(false);
      setAdminExamplesLoaded(true);
    }
  };

  const filteredAdminExamples = adminExamples.filter((e) => matches(exampleSearch, e.title, e.category));

  const handleCreateExample = async () => {
    if (!exampleForm.title.trim() || !exampleForm.code.trim() || exampleSaving) return;
    setExampleSaving(true);
    setExampleError("");
    try {
      const res = await apiFetch("/api/examples", {
        method: "POST",
        body: JSON.stringify({
          title: exampleForm.title.trim(),
          description: exampleForm.description.trim() || null,
          category: exampleForm.category,
          code: exampleForm.code,
          install_command: exampleForm.install_command.trim() || null,
          technologies: exampleForm.technologies.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "فشل إنشاء المثال");
      }
      setExampleForm({ title: "", description: "", category: "Frontend", code: "", install_command: "", technologies: "" });
      setShowExampleForm(false);
      loadAdminExamples();
    } catch (e: any) {
      setExampleError(e?.message ?? "فشل إنشاء المثال");
    } finally {
      setExampleSaving(false);
    }
  };

  const handleDeleteExample = (id: number) => setExampleToDelete(id);

  const confirmDeleteExample = async () => {
    if (exampleToDelete == null) return;
    setExampleDeleteLoading(true);
    try {
      const res = await apiFetch(`/api/examples/${exampleToDelete}`, { method: "DELETE" });
      if (res.ok) setAdminExamples((prev) => prev.filter((e) => e.id !== exampleToDelete));
    } finally {
      setExampleDeleteLoading(false);
      setExampleToDelete(null);
    }
  };

  const startEditExample = (ex: AdminExampleItem) => {
    setEditingExampleId(ex.id);
    setEditExampleForm({
      title: ex.title, description: ex.description ?? "", category: ex.category,
      code: ex.code, install_command: ex.install_command ?? "", technologies: (ex.technologies ?? []).join(", "),
    });
    setEditExampleError("");
  };

  const handleUpdateExample = async () => {
    if (editingExampleId == null) return;
    setEditExampleSaving(true);
    setEditExampleError("");
    try {
      const res = await apiFetch(`/api/examples/${editingExampleId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editExampleForm.title,
          description: editExampleForm.description || null,
          category: editExampleForm.category,
          code: editExampleForm.code,
          install_command: editExampleForm.install_command || null,
          technologies: editExampleForm.technologies.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "فشل تحديث المثال");
      }
      const updated = await res.json() as AdminExampleItem;
      setAdminExamples((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setEditingExampleId(null);
    } catch (e: any) {
      setEditExampleError(e?.message ?? "فشل تحديث المثال");
    } finally {
      setEditExampleSaving(false);
    }
  };

  // ── Community posts tab ─────────────────────────────────────────────────
  const loadCommunityPosts = async () => {
    setCommunityPostsLoading(true);
    try {
      const res = await apiFetch("/api/admin/community-posts?limit=200");
      const data = res.ok ? await res.json() : [];
      setCommunityPosts(Array.isArray(data) ? data : []);
    } catch {
      setCommunityPosts([]);
    } finally {
      setCommunityPostsLoading(false);
      setCommunityPostsLoaded(true);
    }
  };

  const filteredCommunityPosts = communityPosts.filter((p) => matches(communitySearch, p.title, p.authorName, p.body, p.content));

  const handleDeleteCommunityPost = (id: number) => setCommunityPostToDelete(id);

  const confirmDeleteCommunityPost = async () => {
    if (communityPostToDelete == null) return;
    setCommunityDeleteLoading(true);
    try {
      const res = await apiFetch(`/api/admin/community-posts/${communityPostToDelete}`, { method: "DELETE" });
      if (res.ok) setCommunityPosts((prev) => prev.filter((p) => p.id !== communityPostToDelete));
    } finally {
      setCommunityDeleteLoading(false);
      setCommunityPostToDelete(null);
    }
  };

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "نظرة عامة", icon: <BarChart2 size={16} /> },
    // "users" (full user management — role/ban/score/password) is admin-only on the
    // backend (role:admin route group); employers get a 403 with no usable actions,
    // so the tab is hidden for them rather than showing a confusing empty table.
    ...(isAdmin ? [{ key: "users" as AdminTab, label: "إدارة المستخدمين", icon: <Users size={16} /> }] : []),
    { key: "courses", label: "إدارة الكورسات", icon: <BookOpen size={16} /> },
    { key: "assignments", label: "التكليفات", icon: <FileText size={16} /> },
    { key: "challenges", label: "إدارة التحديات البرمجية", icon: <Trophy size={16} /> },
    { key: "projects", label: "إدارة المشاريع", icon: <FileText size={16} /> },
    { key: "examples", label: "إدارة الأمثلة", icon: <BookOpen size={16} /> },
    { key: "community", label: "منشورات المجتمع", icon: <MessageCircle size={16} /> },
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
        <p className="text-indigo-200">
          مرحباً {user?.firstName ?? "المستخدم"}،{" "}
          {isAdmin ? "أنت تملك صلاحيات كاملة" : "لديك صلاحيات إدارة المحتوى (لا تشمل إدارة المستخدمين)"}
        </p>
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
            { icon: <Users size={24} className="text-indigo-500" />, value: usersData?.total ?? (platformStats as any)?.totalUsers ?? users.length, label: "مستخدم" },
            { icon: <BookOpen size={24} className="text-teal-500" />, value: coursesData?.total ?? courses.length, label: "كورس" },
            { icon: <Video size={24} className="text-purple-500" />, value: totalLessons, label: "درس" },
            { icon: <Trophy size={24} className="text-amber-500" />, value: challengesData?.total ?? challenges.length, label: "تحدي نشط" },
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

        {activeTab === "challenges" && (
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

          {/* Existing challenges list — edit/delete (CRUD) */}
          <div className="mt-6 border-t border-gray-100 pt-4 space-y-3">
            <input value={challengeSearch} onChange={(e) => setChallengeSearch(e.target.value)}
              placeholder="🔍 ابحث في التحديات بالعنوان أو التصنيف..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {filteredChallenges.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">لا توجد تحديات</p>
            ) : (
              pagedChallenges.map((c) => (
                <div key={c.id} className="rounded-2xl border border-gray-100 p-4">
                  {editingChallengeId === c.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input value={editChallengeForm.title} onChange={(e) => setEditChallengeForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="عنوان التحدي" />
                      <input value={editChallengeForm.category} onChange={(e) => setEditChallengeForm((p) => ({ ...p, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="التصنيف" />
                      <select value={editChallengeForm.difficulty} onChange={(e) => setEditChallengeForm((p) => ({ ...p, difficulty: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right bg-white">
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                      <input value={editChallengeForm.points} onChange={(e) => setEditChallengeForm((p) => ({ ...p, points: e.target.value }))} type="number" min="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="النقاط" />
                      <textarea value={editChallengeForm.description} onChange={(e) => setEditChallengeForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="وصف التحدي" />
                      {editChallengeError && <div className="md:col-span-2 text-sm text-red-600">{editChallengeError}</div>}
                      <div className="md:col-span-2 flex justify-end gap-2">
                        <button onClick={() => setEditingChallengeId(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
                          إلغاء
                        </button>
                        <button onClick={handleUpdateChallenge} disabled={editChallengeSaving} className="rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}>
                          {editChallengeSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-2 shrink-0">
                        {/* Edit/delete: owner, admin, or employer (employers have the same
                            full access as admins for challenges — see ChallengePolicy::before). */}
                        {(isAdmin || user?.role === "employer" || (c as any).creator_id === user?.id) && (
                          <>
                            <button onClick={() => startEditChallenge(c)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1">
                              <Pencil size={12} /> تعديل
                            </button>
                            <button onClick={() => handleDeleteChallenge(c.id)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                              <Trash2 size={12} /> حذف
                            </button>
                          </>
                        )}
                        <button onClick={() => toggleContentActive("challenges", c.id, refetchChallenges)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50">
                          {(c as any).is_active === false ? "تفعيل" : "تعطيل"}
                        </button>
                      </div>
                      <div className="text-right flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{c.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {c.category} ·{" "}
                          {c.difficulty === "easy" ? "سهل" : c.difficulty === "medium" ? "متوسط" : "صعب"} · {c.points} نقطة
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <Pager page={challengesPage} pageCount={challengesPageCount} onChange={setChallengesPage} />
          </div>
        </div>
        )}

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
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="🔍 ابحث بالاسم أو اسم المستخدم أو البريد..."
                className="flex-1 max-w-md border border-gray-200 rounded-xl px-4 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <h3 className="font-bold text-gray-900 text-lg shrink-0">جميع المستخدمين ({filteredUsers.length})</h3>
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
                  {pagedUsers.map((u: any, i: number) => (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.deleted_at ? "bg-red-50/40 opacity-70" : ""}`}>
                      <td className="py-3 px-4">
                        {u.deleted_at ? (
                          isAdmin ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleRestoreUser(u.id)}
                                className="text-xs px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-medium">
                                ♻️ استرجاع
                              </button>
                              <button onClick={() => handlePermanentDeleteUser(u.id)}
                                className="text-xs px-3 py-1.5 rounded-full bg-red-900 text-white hover:bg-red-950 font-medium">
                                حذف نهائي
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-red-400">محذوف</span>
                          )
                        ) : isAdmin ? (
                          <div className="flex gap-2 flex-wrap">
                            {u.role !== "creator" && (
                              <button onClick={() => handleSetRole(u.id, "creator")}
                                className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium">
                                صانع محتوى
                              </button>
                            )}
                            {u.role !== "employer" && (
                              <button onClick={() => handleSetRole(u.id, "employer")}
                                className="text-xs px-3 py-1.5 rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 font-medium">
                                صاحب عمل
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
                            <button onClick={() => handleSetScore(u.id, u.points)}
                              className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium">
                              النقاط
                            </button>
                            <button onClick={() => handleSetPassword(u.id)}
                              className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 font-medium">
                              كلمة المرور
                            </button>
                            <button onClick={() => handleBanUser(u.id)}
                              className="text-xs px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium">
                              {u.banned ? "رفع الحظر" : "حظر"}
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)}
                              className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 font-medium">
                              حذف
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">للعرض فقط</span>
                        )}
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
                        {isAdmin ? (
                          <button onClick={() => openUserDetail(u.id)} className="text-right hover:text-indigo-600">
                            <div className="font-medium text-gray-900 hover:text-indigo-600 underline decoration-dotted">
                              {u.name}{u.deleted_at && <span className="text-red-500 text-xs mr-1">(محذوف)</span>}
                            </div>
                            <div className="text-xs text-gray-400">{u.username}</div>
                          </button>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-400">{u.username}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={usersPage} pageCount={usersPageCount} onChange={setUsersPage} />
          </div>
        )}

        {/* User detail modal (admin-only): profile + challenge/assignment answers & scores */}
        {isAdmin && (userDetail || userDetailLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" dir="rtl"
            onClick={() => { setUserDetail(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}>
              {userDetailLoading || !userDetail ? (
                <div className="text-center text-gray-400 py-10">جاري التحميل...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setUserDetail(null)} className="text-gray-400 hover:text-gray-700">✕</button>
                    <div className="text-right">
                      <h3 className="font-bold text-gray-900 text-lg">{userDetail.user.name}</h3>
                      <p className="text-xs text-gray-400">{userDetail.user.email} · {userDetail.user.role} · {userDetail.user.points} نقطة</p>
                    </div>
                  </div>

                  {/* Challenges with submitted code + editable score */}
                  <h4 className="font-bold text-gray-800 text-sm mb-2 text-right border-b pb-1">التحديات وإجاباتها</h4>
                  {userDetail.challenges.length === 0 ? (
                    <p className="text-xs text-gray-400 text-right mb-4">لا توجد محاولات.</p>
                  ) : (
                    <div className="space-y-3 mb-5">
                      <input value={userChallengeSearch} onChange={(e) => setUserChallengeSearch(e.target.value)}
                        placeholder="🔍 ابحث في عنوان التحدي..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      {userDetail.challenges.filter((c) => matches(userChallengeSearch, c.title)).map((c) => (
                        <div key={c.id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input type="number" min={0} max={100} defaultValue={c.score}
                                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                                onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v !== c.score) gradeChallenge(userDetail.user.id, c.id, v); }} />
                              <span className={`text-xs px-2 py-0.5 rounded-full ${c.success ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{c.success ? "ناجح" : "غير ناجح"}</span>
                              <button onClick={() => deleteChallengeSubmissionAdmin(userDetail.user.id, (c as any).submission_id ?? c.id)}
                                className="text-xs text-rose-500 hover:underline">حذف</button>
                            </div>
                            <span className="font-medium text-gray-800 text-sm">{c.title}</span>
                          </div>
                          {c.submitted_code && (
                            <pre className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs overflow-x-auto text-left" dir="ltr">{c.submitted_code}</pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assignments with solution + editable score */}
                  <h4 className="font-bold text-gray-800 text-sm mb-2 text-right border-b pb-1">التكليفات وإجاباتها</h4>
                  {userDetail.assignments.length === 0 ? (
                    <p className="text-xs text-gray-400 text-right">لا توجد تسليمات.</p>
                  ) : (
                    <div className="space-y-3">
                      <input value={userAssignmentSearch} onChange={(e) => setUserAssignmentSearch(e.target.value)}
                        placeholder="🔍 ابحث في عنوان التكليف..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      {userDetail.assignments.filter((a) => matches(userAssignmentSearch, a.title)).map((a) => (
                        <div key={a.submission_id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input type="number" min={0} max={100} defaultValue={a.score}
                                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                                onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v !== a.score) gradeAssignment(userDetail.user.id, a.submission_id, v); }} />
                              <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_completed ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{a.status}</span>
                              <button onClick={() => deleteAssignmentSubmissionAdmin(userDetail.user.id, a.submission_id)}
                                className="text-xs text-rose-500 hover:underline">حذف</button>
                            </div>
                            <span className="font-medium text-gray-800 text-sm">{a.title}</span>
                          </div>
                          {a.solution && (
                            <pre className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs overflow-x-auto text-left" dir="ltr">{a.solution}</pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
                <h4 className="font-bold text-gray-900 text-right">{filteredCourses.length} كورس</h4>
              </div>
              <div className="px-6 pt-3">
                <input value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="🔍 ابحث في الكورسات بالعنوان أو التصنيف..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="divide-y divide-gray-50">
                {filteredCourses.map((c) => (
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
                        {/* Delete is owner-or-admin only (CoursePolicy::delete has no employer carve-out). */}
                        {(isAdmin || (c as any).creatorId === user?.id) && (
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                          >
                            حذف الكورس
                          </button>
                        )}
                        <button
                          onClick={() => toggleContentActive("courses", c.id, refetchCourses)}
                          className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium"
                        >
                          {(c as any).is_active === false ? "تفعيل" : "تعطيل"}
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
                              {lesson.videoUrl && (
                                <video src={lesson.videoUrl} controls className="w-full rounded-2xl border border-gray-200 max-h-64 bg-black" />
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

        {/* Assignments Management */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => { setShowAssignmentForm((p) => !p); setAssignmentError(""); }}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}>
                {showAssignmentForm ? <X size={16} /> : <Plus size={16} />}
                {showAssignmentForm ? "إلغاء" : "إضافة تكليف جديد"}
              </button>
              <h3 className="font-bold text-gray-900 text-lg">إدارة التكليفات</h3>
            </div>

            {showAssignmentForm && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={assignmentForm.course_id} onChange={(e) => setAssignmentForm((p) => ({ ...p, course_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                  <option value="">اختر الكورس</option>
                  {courses.map((c: Course) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <input value={assignmentForm.title} onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="عنوان التكليف" />
                <textarea value={assignmentForm.question} onChange={(e) => setAssignmentForm((p) => ({ ...p, question: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="نص السؤال / المطلوب من المتدرب" />
                <textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="وصف إضافي (اختياري)" />
                <textarea value={assignmentForm.requirements} onChange={(e) => setAssignmentForm((p) => ({ ...p, requirements: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="المتطلبات (اختياري)" />
                <textarea value={assignmentForm.help_text} onChange={(e) => setAssignmentForm((p) => ({ ...p, help_text: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="نص المساعدة الذي سيظهر للطالب عند الضغط على «طلب مساعدة» (اختياري)" />
                <select value={assignmentForm.difficulty} onChange={(e) => setAssignmentForm((p) => ({ ...p, difficulty: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                  {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>مستوى الصعوبة: {d}</option>)}
                </select>
                <input value={assignmentForm.language} onChange={(e) => setAssignmentForm((p) => ({ ...p, language: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="لغة البرمجة (اختياري)" />
                <input value={assignmentForm.points} onChange={(e) => setAssignmentForm((p) => ({ ...p, points: e.target.value }))} type="number" min="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="النقاط" />
                <input value={assignmentForm.assignment_order} onChange={(e) => setAssignmentForm((p) => ({ ...p, assignment_order: e.target.value }))} type="number" min="1" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="ترتيب التكليف" />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={assignmentForm.is_active} onChange={(e) => setAssignmentForm((p) => ({ ...p, is_active: e.target.checked }))} />
                  مفعّل (يظهر للمتدربين)
                </label>
                {assignmentError && <div className="md:col-span-2 text-sm text-red-600">{assignmentError}</div>}
                <div className="md:col-span-2 flex justify-end">
                  <button onClick={handleCreateAssignment} disabled={!assignmentForm.course_id || !assignmentForm.title || !assignmentForm.question || assignmentSaving} className="rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}>
                    {assignmentSaving ? "جاري الحفظ..." : "حفظ التكليف"}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => void loadAssignments()} className="text-sm font-semibold text-indigo-600">تحديث</button>
                <h4 className="font-bold text-gray-900 text-right">{assignments.length} تكليف</h4>
              </div>
              <div className="divide-y divide-gray-50 p-4 space-y-3">
                {assignmentsLoaded && (
                  <input value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)}
                    placeholder="🔍 ابحث في التكليفات بالعنوان أو اللغة..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
                {assignmentsLoading ? (
                  <p className="text-center text-sm text-gray-400 py-4">جاري التحميل...</p>
                ) : !assignmentsLoaded ? (
                  <button onClick={() => void loadAssignments()} className="mx-auto block mt-2 text-xs text-indigo-500 underline">تحميل التكليفات</button>
                ) : filteredAssignments.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">لا توجد تكليفات</p>
                ) : (
                  filteredAssignments.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-gray-100 p-4">
                      {editingAssignmentId === a.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select value={editAssignmentForm.course_id} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, course_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right bg-white">
                            {courses.map((c: Course) => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                          <input value={editAssignmentForm.title} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="عنوان التكليف" />
                          <textarea value={editAssignmentForm.question} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, question: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="نص السؤال" />
                          <textarea value={editAssignmentForm.description} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="وصف إضافي" />
                          <textarea value={editAssignmentForm.requirements} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, requirements: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="المتطلبات" />
                          <textarea value={editAssignmentForm.help_text} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, help_text: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="نص المساعدة (يظهر للطالب عند طلب المساعدة)" />
                          <select value={editAssignmentForm.difficulty} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, difficulty: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right bg-white">
                            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>مستوى الصعوبة: {d}</option>)}
                          </select>
                          <input value={editAssignmentForm.language} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, language: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="لغة البرمجة" />
                          <input value={editAssignmentForm.points} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, points: e.target.value }))} type="number" min="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="النقاط" />
                          <input value={editAssignmentForm.assignment_order} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, assignment_order: e.target.value }))} type="number" min="1" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="ترتيب التكليف" />
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input type="checkbox" checked={editAssignmentForm.is_active} onChange={(e) => setEditAssignmentForm((p) => ({ ...p, is_active: e.target.checked }))} />
                            مفعّل (يظهر للمتدربين)
                          </label>
                          {editAssignmentError && <div className="md:col-span-2 text-sm text-red-600">{editAssignmentError}</div>}
                          <div className="md:col-span-2 flex justify-end gap-2">
                            <button onClick={() => setEditingAssignmentId(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
                              إلغاء
                            </button>
                            <button onClick={handleUpdateAssignment} disabled={editAssignmentSaving} className="rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)" }}>
                              {editAssignmentSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => startEditAssignment(a)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1">
                              <Pencil size={12} /> تعديل
                            </button>
                            <button onClick={() => handleDeleteAssignment(a.id)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                              <Trash2 size={12} /> حذف
                            </button>
                            <button onClick={() => toggleContentActive("assignments", a.id, loadAssignments)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50">
                              {a.is_active ? "تعطيل" : "تفعيل"}
                            </button>
                          </div>
                          <div className="text-right flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{a.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {courses.find((c: Course) => c.id === a.course_id)?.title ?? `كورس #${a.course_id}`} ·{" "}
                              مستوى {a.difficulty} · {a.points} نقطة{a.is_active ? "" : " · غير مفعّل"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => { setShowProjectForm((p) => !p); setProjectError(""); }}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                {showProjectForm ? <X size={16} /> : <Plus size={16} />}
                {showProjectForm ? "إلغاء" : "إضافة مشروع جديد"}
              </button>
              <h3 className="font-bold text-gray-900 text-lg">إدارة المشاريع</h3>
            </div>

            {showProjectForm && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={projectForm.title} onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="عنوان المشروع" />
                <select value={projectForm.track} onChange={(e) => setProjectForm((p) => ({ ...p, track: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                  <option value="basics">أساسيات</option>
                  <option value="frontend">واجهات أمامية</option>
                  <option value="backend">واجهات خلفية</option>
                </select>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="وصف المشروع" />
                <input value={projectForm.category} onChange={(e) => setProjectForm((p) => ({ ...p, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="التصنيف (اختياري)" />
                <input value={projectForm.tags} onChange={(e) => setProjectForm((p) => ({ ...p, tags: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="الوسوم (مفصولة بفواصل)" />
                <select value={projectForm.difficulty} onChange={(e) => setProjectForm((p) => ({ ...p, difficulty: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                  {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>مستوى الصعوبة: {d}</option>)}
                </select>
                {projectError && <div className="md:col-span-2 text-sm text-red-600">{projectError}</div>}
                <div className="md:col-span-2 flex justify-end">
                  <button onClick={handleCreateProject} disabled={!projectForm.title.trim() || projectSaving} className="rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                    {projectSaving ? "جاري الحفظ..." : "حفظ المشروع"}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => void loadAdminProjects()} className="text-sm font-semibold text-indigo-600">تحديث</button>
                <h4 className="font-bold text-gray-900 text-right">{adminProjects.length} مشروع</h4>
              </div>
              <div className="divide-y divide-gray-50 p-4 space-y-3">
                {adminProjectsLoaded && (
                  <input value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="🔍 ابحث في المشاريع بالعنوان أو التصنيف..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
                {adminProjectsLoading ? (
                  <p className="text-center text-sm text-gray-400 py-4">جاري التحميل...</p>
                ) : !adminProjectsLoaded ? (
                  <button onClick={() => void loadAdminProjects()} className="mx-auto block mt-2 text-xs text-indigo-500 underline">تحميل المشاريع</button>
                ) : filteredAdminProjects.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">لا توجد مشاريع</p>
                ) : (
                  filteredAdminProjects.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-gray-100 p-4">
                      {editingProjectId === p.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input value={editProjectForm.title} onChange={(e) => setEditProjectForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="عنوان المشروع" />
                          <select value={editProjectForm.track} onChange={(e) => setEditProjectForm((f) => ({ ...f, track: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right bg-white">
                            <option value="basics">أساسيات</option>
                            <option value="frontend">واجهات أمامية</option>
                            <option value="backend">واجهات خلفية</option>
                          </select>
                          <textarea value={editProjectForm.description} onChange={(e) => setEditProjectForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="وصف المشروع" />
                          <input value={editProjectForm.category} onChange={(e) => setEditProjectForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="التصنيف" />
                          <input value={editProjectForm.tags} onChange={(e) => setEditProjectForm((f) => ({ ...f, tags: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="الوسوم (مفصولة بفواصل)" />
                          <select value={editProjectForm.difficulty} onChange={(e) => setEditProjectForm((f) => ({ ...f, difficulty: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right bg-white">
                            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>مستوى الصعوبة: {d}</option>)}
                          </select>
                          {editProjectError && <div className="md:col-span-2 text-sm text-red-600">{editProjectError}</div>}
                          <div className="md:col-span-2 flex justify-end gap-2">
                            <button onClick={() => setEditingProjectId(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">إلغاء</button>
                            <button onClick={handleUpdateProject} disabled={editProjectSaving} className="rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                              {editProjectSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => startEditProject(p)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1">
                              <Pencil size={12} /> تعديل
                            </button>
                            <button onClick={() => handleDeleteProject(p.id)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                              <Trash2 size={12} /> حذف
                            </button>
                            <button onClick={() => toggleContentActive("projects", p.id, loadAdminProjects)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50">
                              {p.is_active === false ? "تفعيل" : "تعطيل"}
                            </button>
                          </div>
                          <div className="text-right flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">
                              {p.title}
                              {p.is_active === false && <span className="text-xs text-orange-500 mr-1"> (معطّل)</span>}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {p.category ?? p.track} · مستوى {p.difficulty}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "examples" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => { setShowExampleForm((p) => !p); setExampleError(""); }}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                {showExampleForm ? <X size={16} /> : <Plus size={16} />}
                {showExampleForm ? "إلغاء" : "إضافة مثال جديد"}
              </button>
              <h3 className="font-bold text-gray-900 text-lg">إدارة الأمثلة</h3>
            </div>

            {showExampleForm && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={exampleForm.title} onChange={(e) => setExampleForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="عنوان المثال" />
                <select value={exampleForm.category} onChange={(e) => setExampleForm((p) => ({ ...p, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-white">
                  {["Frontend", "Backend", "تطبيقات الجوال", "الخوارزميات"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <textarea value={exampleForm.description} onChange={(e) => setExampleForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right md:col-span-2 resize-none" placeholder="وصف مختصر للمثال" />
                <textarea value={exampleForm.code} onChange={(e) => setExampleForm((p) => ({ ...p, code: e.target.value }))} rows={6} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-left md:col-span-2 resize-none" placeholder="الكود البرمجي" dir="ltr" />
                <input value={exampleForm.install_command} onChange={(e) => setExampleForm((p) => ({ ...p, install_command: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-left" placeholder="أمر التثبيت (اختياري)" dir="ltr" />
                <input value={exampleForm.technologies} onChange={(e) => setExampleForm((p) => ({ ...p, technologies: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right" placeholder="التقنيات (مفصولة بفواصل)" />
                {exampleError && <div className="md:col-span-2 text-sm text-red-600">{exampleError}</div>}
                <div className="md:col-span-2 flex justify-end">
                  <button onClick={handleCreateExample} disabled={!exampleForm.title.trim() || !exampleForm.code.trim() || exampleSaving} className="rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                    {exampleSaving ? "جاري الحفظ..." : "حفظ المثال"}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => void loadAdminExamples()} className="text-sm font-semibold text-indigo-600">تحديث</button>
                <h4 className="font-bold text-gray-900 text-right">{adminExamples.length} مثال</h4>
              </div>
              <div className="divide-y divide-gray-50 p-4 space-y-3">
                {adminExamplesLoaded && (
                  <input value={exampleSearch} onChange={(e) => setExampleSearch(e.target.value)}
                    placeholder="🔍 ابحث في الأمثلة بالعنوان أو التصنيف..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
                {adminExamplesLoading ? (
                  <p className="text-center text-sm text-gray-400 py-4">جاري التحميل...</p>
                ) : !adminExamplesLoaded ? (
                  <button onClick={() => void loadAdminExamples()} className="mx-auto block mt-2 text-xs text-indigo-500 underline">تحميل الأمثلة</button>
                ) : filteredAdminExamples.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">لا توجد أمثلة</p>
                ) : (
                  filteredAdminExamples.map((ex) => (
                    <div key={ex.id} className="rounded-2xl border border-gray-100 p-4">
                      {editingExampleId === ex.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input value={editExampleForm.title} onChange={(e) => setEditExampleForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="عنوان المثال" />
                          <select value={editExampleForm.category} onChange={(e) => setEditExampleForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right bg-white">
                            {["Frontend", "Backend", "تطبيقات الجوال", "الخوارزميات"].map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <textarea value={editExampleForm.description} onChange={(e) => setEditExampleForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right md:col-span-2 resize-none" placeholder="وصف مختصر" />
                          <textarea value={editExampleForm.code} onChange={(e) => setEditExampleForm((f) => ({ ...f, code: e.target.value }))} rows={6} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-left md:col-span-2 resize-none" placeholder="الكود البرمجي" dir="ltr" />
                          <input value={editExampleForm.install_command} onChange={(e) => setEditExampleForm((f) => ({ ...f, install_command: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left" placeholder="أمر التثبيت" dir="ltr" />
                          <input value={editExampleForm.technologies} onChange={(e) => setEditExampleForm((f) => ({ ...f, technologies: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right" placeholder="التقنيات (مفصولة بفواصل)" />
                          {editExampleError && <div className="md:col-span-2 text-sm text-red-600">{editExampleError}</div>}
                          <div className="md:col-span-2 flex justify-end gap-2">
                            <button onClick={() => setEditingExampleId(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">إلغاء</button>
                            <button onClick={handleUpdateExample} disabled={editExampleSaving} className="rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                              {editExampleSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => startEditExample(ex)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1">
                              <Pencil size={12} /> تعديل
                            </button>
                            <button onClick={() => handleDeleteExample(ex.id)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                              <Trash2 size={12} /> حذف
                            </button>
                            <button onClick={() => toggleContentActive("examples", ex.id, loadAdminExamples)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50">
                              {ex.is_active === false ? "تفعيل" : "تعطيل"}
                            </button>
                          </div>
                          <div className="text-right flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{ex.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {ex.category}
                              {ex.is_active === false && <span className="text-xs text-orange-500 mr-1"> (معطّل)</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "community" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => void loadCommunityPosts()} className="text-sm font-semibold text-indigo-600">تحديث</button>
                <h3 className="font-bold text-gray-900 text-lg">منشورات المجتمع</h3>
              </div>
              <div className="divide-y divide-gray-50 p-4 space-y-3">
                {communityPostsLoaded && (
                  <input value={communitySearch} onChange={(e) => setCommunitySearch(e.target.value)}
                    placeholder="🔍 ابحث بالعنوان أو الكاتب أو المحتوى..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
                {communityPostsLoading ? (
                  <p className="text-center text-sm text-gray-400 py-4">جاري التحميل...</p>
                ) : !communityPostsLoaded ? (
                  <button onClick={() => void loadCommunityPosts()} className="mx-auto block mt-2 text-xs text-indigo-500 underline">تحميل المنشورات</button>
                ) : filteredCommunityPosts.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">لا توجد منشورات</p>
                ) : (
                  filteredCommunityPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4">
                      <button onClick={() => handleDeleteCommunityPost(post.id)} className="text-xs rounded-full px-3 py-1.5 font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1 shrink-0">
                        <Trash2 size={12} /> حذف
                      </button>
                      <div className="text-right flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{post.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {post.authorName} · {post.commentsCount ?? 0} تعليق · {post.likesCount ?? 0} إعجاب
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
              {reviews.length > 0 && (
                <input value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="🔍 ابحث بالمستخدم أو الكورس..."
                  className="w-full mb-4 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              )}
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
                  {reviews.filter((r) => matches(reviewSearch, r.userName, r.courseTitle, r.comment)).map((review) => (
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
              {comments.length > 0 && (
                <input value={commentSearch} onChange={(e) => setCommentSearch(e.target.value)}
                  placeholder="🔍 ابحث بالمستخدم أو الكورس أو نص التعليق..."
                  className="w-full mb-4 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              )}
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
                  {comments.filter((c) => matches(commentSearch, c.userName, c.courseTitle, c.lessonTitle, c.content)).slice(0, 30).map((item) => (
                    <div key={`${(item as any).type ?? "comment"}-${item.id}`} className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => void handleDeleteComment(item.id, (item as any).type)}
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
                        const isBanned = log.userId ? !!users.find((u: any) => u.id === log.userId)?.banned : false;
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

      <ConfirmDialog
        open={!!confirmUserAction}
        onOpenChange={(open) => { if (!open) setConfirmUserAction(null); }}
        title={confirmUserAction?.type === "permanent" ? "حذف نهائي؟" : "حذف هذا المستخدم؟"}
        description={
          confirmUserAction?.type === "permanent"
            ? "سيتم محو هذا الحساب وكل بياناته نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء أو استرجاع الحساب بعده."
            : "لن يتمكن من تسجيل الدخول مجدداً، لكن بياناته تبقى محفوظة ويمكن استرجاع الحساب لاحقاً."
        }
        confirmLabel={confirmUserAction?.type === "permanent" ? "حذف نهائي" : "حذف"}
        loading={confirmActionLoading}
        onConfirm={runConfirmedUserAction}
      />

      <ConfirmDialog
        open={!!genericConfirm}
        onOpenChange={(open) => { if (!open) setGenericConfirm(null); }}
        title={genericConfirm?.title ?? ""}
        description={genericConfirm?.description ?? ""}
        confirmLabel="حذف"
        loading={genericConfirmLoading}
        onConfirm={runGenericConfirm}
      />

      <ConfirmDialog
        open={projectToDelete != null}
        onOpenChange={(open) => { if (!open) setProjectToDelete(null); }}
        title="حذف هذا المشروع؟"
        description="لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        loading={projectDeleteLoading}
        onConfirm={confirmDeleteProject}
      />

      <ConfirmDialog
        open={exampleToDelete != null}
        onOpenChange={(open) => { if (!open) setExampleToDelete(null); }}
        title="حذف هذا المثال؟"
        description="لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        loading={exampleDeleteLoading}
        onConfirm={confirmDeleteExample}
      />

      <ConfirmDialog
        open={communityPostToDelete != null}
        onOpenChange={(open) => { if (!open) setCommunityPostToDelete(null); }}
        title="حذف هذا المنشور؟"
        description="سيتم حذف المنشور وجميع تعليقاته وإعجاباته نهائياً."
        confirmLabel="حذف"
        loading={communityDeleteLoading}
        onConfirm={confirmDeleteCommunityPost}
      />
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
      {lesson.videoUrl && (
        <video src={lesson.videoUrl} controls className="w-full rounded-2xl border border-gray-200 max-h-64 bg-black" />
      )}
    </div>
  );
}
