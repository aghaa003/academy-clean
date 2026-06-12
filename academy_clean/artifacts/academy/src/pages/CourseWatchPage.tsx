import { useState, useEffect, useRef, useCallback } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link, useParams, useSearch } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useGetCourse } from "@workspace/api-client-react";
import {
  Play, Lock, BookOpen, ChevronLeft, ChevronRight,
  CheckCircle, Heart, MessageSquare, Send, Pause,
  Volume2, VolumeX, Maximize2, FileText, Paperclip, Star
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = BASE;

interface LessonProgressData {
  completed: boolean;
  watchedSeconds: number;
}

interface Comment {
  id: number;
  lessonId: number;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userAvatar: string | null;
  parentId?: number | null;
}

interface LikesData {
  count: number;
  liked: boolean;
}

interface Lesson {
  id: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  duration?: number | null;
  order: number;
}

function formatDuration(secs?: number | null) {
  if (!secs) return "--:--";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

export default function CourseWatchPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoaded } = useCurrentUser();
  const courseId = Number(id);
  const search = useSearch();
  const initialLessonId = Number(new URLSearchParams(search).get("lesson")) || null;

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { queryKey: ["course", courseId], enabled: !!courseId },
  });

  const lessons: Lesson[] = (course as any)?.lessons ?? [];

  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, LessonProgressData>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likesData, setLikesData] = useState<LikesData>({ count: 0, liked: false });
  const [commentLoading, setCommentLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  // Course rating state
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0] ?? null;

  // Sync the rating widget whenever the course data loads/changes.
  useEffect(() => {
    if (!course) return;
    setAvgRating(Number((course as any).averageRating) || 0);
    setTotalReviews(Number((course as any).totalReviews) || 0);
    setMyRating((course as any).myRating ?? null);
  }, [course]);

  const submitRating = async (n: number) => {
    if (!courseId || ratingSaving) return;
    setRatingSaving(true);
    try {
      const res = await apiFetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: n }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyRating(n);
        setAvgRating(Number(data.averageRating) || n);
        setTotalReviews(Number(data.totalReviews) || totalReviews);
      }
    } finally {
      setRatingSaving(false);
    }
  };

  useEffect(() => {
    if (lessons.length > 0 && activeLessonId === null) {
      const target = initialLessonId && lessons.some((l) => l.id === initialLessonId)
        ? initialLessonId
        : lessons[0].id;
      setActiveLessonId(target);
    }
  }, [lessons, activeLessonId, initialLessonId]);

  const fetchCourseProgress = useCallback(async () => {
    if (!user || !courseId) return;
    try {
      const res = await apiFetch(`/api/courses/${courseId}/progress`, );
      if (res.ok) {
        const rows: any[] = await res.json();
        const map: Record<number, LessonProgressData> = {};
        rows.forEach((r) => { map[r.lessonId] = { completed: r.completed, watchedSeconds: r.watchedSeconds }; });
        setProgressMap(map);
      }
    } catch {}
  }, [user, courseId]);

  useEffect(() => {
    if (!user || !courseId) return;
    apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST" })
      .catch(() => {})
      .finally(() => fetchCourseProgress());
  }, [user, courseId, fetchCourseProgress]);

  const fetchComments = useCallback(async (lessonId: number) => {
    try {
      const res = await apiFetch(`/api/lessons/${lessonId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch {}
  }, []);

  const fetchLikes = useCallback(async (lessonId: number) => {
    try {
      const res = await apiFetch(`/api/lessons/${lessonId}/likes`, );
      if (res.ok) setLikesData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeLesson) return;
    setIsPlaying(false);
    setVideoProgress(0);
    fetchComments(activeLesson.id);
    fetchLikes(activeLesson.id);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [activeLesson?.id]);

  const resumeFromSavedPosition = useCallback(() => {
    const v = videoRef.current;
    if (!v || !activeLesson) return;
    const saved = progressMap[activeLesson.id]?.watchedSeconds ?? 0;
    if (saved > 1 && v.duration && saved < v.duration - 1) {
      v.currentTime = saved;
    }
  }, [activeLesson, progressMap]);

  // Resume if progress data arrives after the video metadata has already loaded
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeLesson) return;
    if (v.readyState >= 1) resumeFromSavedPosition();
  }, [progressMap, activeLesson?.id, resumeFromSavedPosition]);

  const saveProgress = useCallback(async (lessonId: number, watchedSeconds: number, completed: boolean) => {
  if (!user) return;
  try {
    const res = await apiFetch(`/api/lessons/${lessonId}/progress`, {
      method: "POST",
      body: JSON.stringify({ watchedSeconds, completed, courseId }),
    });
    if (res.ok) {
      setProgressMap((prev) => ({ ...prev, [lessonId]: { completed, watchedSeconds } }));
    }
  } catch {}
}, [user, courseId]);

  const handleVideoTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !activeLesson) return;
    const watched = Math.floor(v.currentTime);
    const pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    setVideoProgress(pct);
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    // Avoid persisting "0 seconds watched" — this happens on initial load
    // before any resume/seek occurs and would overwrite real saved progress.
    if (watched <= 0) return;
    progressSaveTimer.current = setTimeout(() => {
      saveProgress(activeLesson.id, watched, pct > 90);
    }, 3000);
  };

  const handleVideoEnded = () => {
    if (!activeLesson) return;
    const dur = videoRef.current?.duration ?? activeLesson.duration ?? 0;
    saveProgress(activeLesson.id, Math.floor(dur), true);
    setIsPlaying(false);
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    await saveProgress(activeLesson.id, activeLesson.duration ?? 0, true);
    const curIdx = lessons.findIndex((l) => l.id === activeLesson.id);
    if (curIdx < lessons.length - 1) setActiveLessonId(lessons[curIdx + 1].id);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const handleLike = async () => {
    if (!user || likeLoading || !activeLesson) return;
    setLikeLoading(true);
    try {
      const res = await apiFetch(`/api/lessons/${activeLesson.id}/like`, {
        method: "POST", 
      });
      if (res.ok) setLikesData(await res.json());
    } finally { setLikeLoading(false); }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim() || commentLoading || !activeLesson) return;
    setCommentLoading(true);
    try {
      const res = await apiFetch(`/api/lessons/${activeLesson.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [c, ...prev]);
        setNewComment("");
      }
    } finally { setCommentLoading(false); }
  };

  const handleReply = async (parentId: number) => {
    if (!user || !replyContent.trim() || replyLoading || !activeLesson) return;
    setReplyLoading(true);
    try {
      const res = await apiFetch(`/api/lessons/${activeLesson.id}/comments`, {
        method: "POST", 
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setReplyContent("");
        setReplyingTo(null);
      }
    } finally { setReplyLoading(false); }
  };

  // The course creator (of this course), employers, and admins may moderate comments.
  const courseCreatorId = (course as any)?.creatorId ?? (course as any)?.creator_id ?? (course as any)?.creator?.id;
  const canModerateComments =
    !!user && (user.role === "admin" || user.role === "employer" || user.id === courseCreatorId);

  const handleDeleteComment = async (commentId: number) => {
    if (!activeLesson) return;
    if (!confirm("حذف هذا التعليق؟")) return;
    const res = await apiFetch(`/api/lessons/${activeLesson.id}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      // Drop the comment and any of its replies.
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    }
  };

  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const curIdx = lessons.findIndex((l) => l.id === activeLessonId);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-lg animate-pulse">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
              <Lock size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-3">محتوى محمي</h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              يجب عليك تسجيل الدخول أولاً للوصول إلى محتوى هذا الكورس.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/sign-in" className="rounded-full py-3.5 text-sm font-bold text-white block"
                style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>تسجيل الدخول</Link>
              <Link href="/sign-up" className="rounded-full py-3.5 text-sm font-bold text-indigo-600 border-2 border-indigo-200 block hover:bg-indigo-50 transition-colors">إنشاء حساب جديد</Link>
              <Link href="/courses" className="text-sm text-gray-400 hover:text-gray-600 mt-2">← العودة إلى الكورسات</Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video + info + comments */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Video player */}
          <div className="bg-black rounded-2xl overflow-hidden aspect-video relative group">
            {activeLesson?.videoUrl ? (
              <>
                <video
                  key={activeLesson?.id}
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={resumeFromSavedPosition}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  preload="metadata"
                >
                  <source src={activeLesson.videoUrl} />
                  متصفحك لا يدعم تشغيل الفيديو
                </video>

                {/* Controls overlay */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-transparent to-transparent">
                  {/* Center play/pause */}
                  <div className="flex-1 flex items-center justify-center" onClick={togglePlay}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
                      {isPlaying
                        ? <Pause size={28} className="text-white" />
                        : <Play size={28} className="text-white ml-1" />}
                    </div>
                  </div>

                  {/* Bottom controls */}
                  <div className="px-4 pb-3">
                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 relative"
                      onClick={handleSeek}>
                      <div className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${videoProgress}%` }} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay} className="text-white hover:text-indigo-300 transition-colors">
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button onClick={toggleMute} className="text-white hover:text-indigo-300 transition-colors">
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <span className="text-white/60 text-xs flex-1">{activeLesson.title}</span>
                      <button onClick={handleFullscreen} className="text-white hover:text-indigo-300 transition-colors">
                        <Maximize2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Click to play when paused */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
                      <Play size={32} className="text-white mr-[-4px]" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
                  <Play size={32} className="text-white mr-[-4px]" />
                </div>
                <p className="text-white/60 text-sm">{activeLesson?.title ?? "اختر درساً"}</p>
                <p className="text-white/30 text-xs mt-1">لا يوجد فيديو لهذا الدرس</p>
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="text-right flex-1 min-w-0">
                <h1 className="text-white font-bold text-xl truncate">{course?.title ?? "الكورس"}</h1>
                {(course as any)?.creatorName && (
                  <p className="text-gray-500 text-xs mt-0.5">المدرب: {(course as any).creatorName}</p>
                )}

                {/* Course rating */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
                    <Star size={14} fill="#f59e0b" className="text-amber-400" />
                    <span className="text-amber-300 text-sm font-bold">{avgRating.toFixed(1)}</span>
                    <span className="text-gray-500 text-xs">({totalReviews})</span>
                  </div>
                  {user && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{myRating ? "تقييمك:" : "قيّم الكورس:"}</span>
                      <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            disabled={ratingSaving}
                            onClick={() => submitRating(n)}
                            onMouseEnter={() => setHoverRating(n)}
                            className="p-0.5 disabled:opacity-50 transition-transform hover:scale-110"
                            title={`${n} نجوم`}
                          >
                            <Star
                              size={18}
                              className={(hoverRating || myRating || 0) >= n ? "text-amber-400" : "text-gray-600"}
                              fill={(hoverRating || myRating || 0) >= n ? "#f59e0b" : "none"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">{activeLesson?.title ?? ""}</p>
                {activeLesson?.description && (
                  <p className="text-gray-500 text-xs mt-2 leading-relaxed">{activeLesson.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Like */}
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    likesData.liked
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "border border-gray-700 text-gray-400 hover:border-red-400 hover:text-red-400"
                  }`}
                >
                  <Heart size={16} fill={likesData.liked ? "currentColor" : "none"} />
                  <span>{likesData.count}</span>
                </button>

                {progressMap[activeLessonId ?? 0]?.completed ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/40">
                    <CheckCircle size={16} />
                    <span>مكتمل</span>
                  </div>
                ) : (
                  <button
                    onClick={handleMarkComplete}
                    className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
                    style={{ background: "linear-gradient(90deg,#16a34a,#15803d)" }}
                  >
                    إنهاء الدرس ✓
                  </button>
                )}
              </div>
            </div>


            {/* Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{progress}%</span>
                <span>{completedCount}/{lessons.length} درس مكتمل</span>
              </div>
              <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#3730a3,#7c3aed)" }} />
              </div>
            </div>
          </div>

          {/* Nav arrows */}
          <div className="flex gap-3">
            <button
              disabled={curIdx <= 0}
              onClick={() => curIdx > 0 && setActiveLessonId(lessons[curIdx - 1].id)}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold border border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
              الدرس السابق
            </button>
            <button
              disabled={curIdx >= lessons.length - 1}
              onClick={() => curIdx < lessons.length - 1 && setActiveLessonId(lessons[curIdx + 1].id)}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
            >
              الدرس التالي
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Files & Resources — standalone section below nav arrows */}
          {(activeLesson?.pdfUrl || activeLesson?.attachmentUrl) && (
            <div className="bg-gray-900 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip size={16} className="text-indigo-400" />
                <h3 className="text-white font-bold">ملفات الدرس والأكواد</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeLesson.pdfUrl && (
                  <a
                    href={activeLesson.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-500/50 rounded-xl px-4 py-3 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-white text-sm font-semibold group-hover:text-red-300 transition-colors">ملف PDF</div>
                      <div className="text-gray-400 text-xs mt-0.5">انقر للتحميل أو الفتح</div>
                    </div>
                  </a>
                )}
                {activeLesson.attachmentUrl && (
                  <a
                    href={activeLesson.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-500/50 rounded-xl px-4 py-3 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Paperclip size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-white text-sm font-semibold group-hover:text-amber-300 transition-colors truncate">
                        {activeLesson.attachmentName ?? "ملف الأكواد"}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">انقر للتحميل</div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare size={18} className="text-indigo-400" />
              <h3 className="text-white font-bold">التعليقات</h3>
              <span className="text-gray-500 text-sm">({comments.length})</span>
            </div>

            {/* Add comment */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleComment())}
                  placeholder="اكتب تعليقك هنا..."
                  rows={2}
                  className="w-full bg-gray-800 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-500 text-right"
                />
              </div>
              <button
                onClick={handleComment}
                disabled={commentLoading || !newComment.trim()}
                className="self-end px-4 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}
              >
                <Send size={16} />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex flex-col gap-4 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">لا توجد تعليقات بعد. كن أول من يعلّق!</p>
              ) : (
                comments.filter((c) => !c.parentId).map((c) => (
                  <div key={c.id} className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
{(c.userName ?? "م").charAt(0).toUpperCase()}                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-sm font-semibold">{c.userName ?? "مستخدم"}</span>
                          <span className="text-gray-500 text-xs">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{c.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {user && (
                            <button
                              onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              {replyingTo === c.id ? "إلغاء" : "رد"}
                            </button>
                          )}
                          {(canModerateComments || c.userId === user?.id) && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comments.filter((r) => r.parentId === c.id).map((reply) => (
                      <div key={reply.id} className="flex gap-3 pr-12">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7)" }}>
{(reply.userName ?? "م").charAt(0).toUpperCase()}                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-xs font-semibold">{reply.userName ?? "مستخدم"}</span>
                            <span className="text-gray-500 text-xs">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-gray-300 text-xs leading-relaxed">{reply.content}</p>
                          {(canModerateComments || reply.userId === user?.id) && (
                            <button
                              onClick={() => handleDeleteComment(reply.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors mt-1"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Reply input */}
                    {replyingTo === c.id && (
                      <div className="flex gap-2 pr-12">
                        <input
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleReply(c.id))}
                          placeholder="اكتب ردك..."
                          className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500 text-right"
                        />
                        <button
                          onClick={() => handleReply(c.id)}
                          disabled={replyLoading || !replyContent.trim()}
                          className="px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-40 transition-all"
                          style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lessons sidebar */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-400" />
              <h3 className="text-white font-bold">قائمة الدروس</h3>
            </div>
            <p className="text-gray-400 text-xs mt-1">{completedCount}/{lessons.length} دروس مكتملة</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lessons.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">لا توجد دروس بعد</div>
            ) : (
              lessons.map((lesson, idx) => {
                const isActive = lesson.id === activeLessonId;
                const isDone = progressMap[lesson.id]?.completed ?? false;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-right border-b border-gray-800/50 transition-colors ${
                      isActive ? "bg-indigo-600/20 border-r-2 border-r-indigo-500" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex-1 text-right">
                      <div className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-300"}`}>
                        {lesson.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-row-reverse">
                        <span>{formatDuration(lesson.duration)}</span>
                        <span>درس {idx + 1}</span>
                        {lesson.videoUrl && <span className="text-indigo-400">▶</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isDone ? (
                        <CheckCircle size={18} className="text-green-400" />
                      ) : isActive ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
                          <Play size={10} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>

      <div className="pb-6" />
    </div>
  );
}
