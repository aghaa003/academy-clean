import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Trophy, Code2, Star, FolderGit2, BookOpen, Loader2,
  ExternalLink, Download, Globe,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { useCurrentUser } from "@/lib/auth-context";
import { RepoRating } from "@/components/RepoRating";

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

interface PublicUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  points: number;
  globalRank: number;
  createdAt: string;
  solvedChallenges: number;
  totalCourses: number;
  totalRepositories: number;
  totalSubmissions: number;
  challengeCategories: any[];
}

interface UserCourse {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  progress: number;
  completed: boolean;
}

interface PublicRepo {
  id: number;
  title: string;
  description: string;
  technologies: string[];
  repoUrl?: string | null;
  liveDemoUrl?: string | null;
  codeFilesUrls?: string[];
  pdfFilesUrls?: string[];
  isPublic: boolean;
  isDraft?: boolean;
  createdAt: string;
  averageRating?: number;
  ratingsCount?: number;
}

const AVATAR_COLORS = ["#3730a3", "#7c3aed", "#0891b2", "#16a34a", "#e11d48", "#f59e0b"];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const TECH_COLORS: Record<string, string> = {
  javascript: "#f59e0b", typescript: "#3b82f6", python: "#16a34a", react: "#06b6d4",
  nodejs: "#15803d", html: "#ea580c", css: "#7c3aed", vue: "#10b981", java: "#ef4444",
};
function techColor(t: string) {
  const k = t.toLowerCase().replace(/[^a-z]/g, "");
  return TECH_COLORS[k] ?? "#6b7280";
}

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { user: viewer } = useCurrentUser();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [repos, setRepos] = useState<PublicRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);

  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "courses">("overview");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/users/${encodeURIComponent(userId)}`, )
      .then(async (res) => {
        if (res.status === 403) { setError("هذا الحساب غير متاح للعرض العام"); return; }
        if (!res.ok) { setError("المستخدم غير موجود"); return; }
        const data = await res.json();
        setProfile(data);
      })
      .catch(() => setError("حدث خطأ أثناء تحميل الملف الشخصي"))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setReposLoading(true);
    apiFetch(`/api/repositories?userId=${encodeURIComponent(userId)}&limit=50`, )
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        // Filter to only public, non-draft repos
        const publicRepos = (data.repositories ?? []).filter(
          (r: any) => r.isPublic !== false && !r.isDraft
        );
        setRepos(publicRepos);
      })
      .catch(() => {})
      .finally(() => setReposLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setCoursesLoading(true);
    apiFetch(`/api/users/${encodeURIComponent(userId)}/courses`, )
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setCourses(data ?? []);
      })
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
  }, [userId]);

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long" })
    : null;

  const color = profile ? avatarColor(profile.name) : "#3730a3";

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 gap-3">
            <Loader2 size={24} className="animate-spin" />
            <span>جاري تحميل الملف الشخصي...</span>
          </div>
        ) : error ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 font-medium text-lg">{error}</p>
            <Link href="/" className="mt-4 inline-block text-indigo-600 font-semibold hover:underline">
              العودة للرئيسية
            </Link>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div
              className="rounded-2xl shadow-sm overflow-hidden"
              style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3,#4c1d95)" }}
            >
              <div className="p-6 sm:p-8 flex items-center gap-6 flex-row-reverse">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white/20 shrink-0 overflow-hidden"
                  style={profile.avatarUrl ? {} : { backgroundColor: color }}
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 text-right">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">{profile.name}</h1>
                  <p className="text-indigo-200 text-sm mt-0.5">@{profile.username}</p>
                  {joinDate && <p className="text-indigo-300/70 text-xs mt-0.5">منضم منذ {joinDate}</p>}
                  {profile.bio && <p className="text-indigo-100/80 text-sm mt-2 leading-relaxed">{profile.bio}</p>}

                  <div className="flex gap-6 mt-5 flex-row-reverse flex-wrap">
                    {[
                      { label: "الترتيب العام", value: `#${profile.globalRank}`, icon: <Trophy size={14} className="text-yellow-300" /> },
                      { label: "نقطة", value: profile.points.toLocaleString(), icon: <Star size={14} className="text-amber-300" /> },
                      { label: "تحدي محلول", value: profile.solvedChallenges, icon: <Code2 size={14} className="text-cyan-300" /> },
                      { label: "مشروع عام", value: repos.length, icon: <FolderGit2 size={14} className="text-purple-300" /> },
                      { label: "كورس", value: profile.totalCourses, icon: <BookOpen size={14} className="text-green-300" /> },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <div className="flex items-center gap-1 justify-center mb-0.5">{s.icon}</div>
                        <div className="text-xl font-extrabold text-white">{s.value}</div>
                        <div className="text-xs text-indigo-300">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab nav */}
            <div className="flex gap-2 border-b border-gray-200">
              {([
                { key: "overview", label: "نظرة عامة" },
                { key: "courses", label: `الكورسات (${courses.length})` },
                { key: "projects", label: `المشاريع العامة (${repos.length})` },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.key
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "إجمالي النقاط", value: profile.points.toLocaleString(), color: "#3730a3", bg: "#ede9fe" },
                    { label: "التحديات المحلولة", value: profile.solvedChallenges, color: "#0891b2", bg: "#e0f2fe" },
                    { label: "المشاريع العامة", value: repos.length, color: "#d97706", bg: "#fef9c3" },
                    { label: "الكورسات", value: profile.totalCourses, color: "#16a34a", bg: "#dcfce7" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl p-5 text-center border"
                      style={{ backgroundColor: s.bg, borderColor: s.color + "30" }}
                    >
                      <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: s.color }}>
                        {s.value}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-right mb-4 text-lg">ملخص النشاط</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-indigo-600 font-semibold">{profile.totalSubmissions}</span>
                      <span className="text-gray-600 text-sm">إجمالي محاولات التحديات</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-green-600 font-semibold">{profile.solvedChallenges}</span>
                      <span className="text-gray-600 text-sm">تحديات محلولة بنجاح</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-amber-600 font-semibold">{profile.points.toLocaleString()}</span>
                      <span className="text-gray-600 text-sm">إجمالي النقاط المكتسبة</span>
                    </div>
                    {profile.totalSubmissions > 0 && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-purple-600 font-semibold">
                          {Math.round((profile.solvedChallenges / profile.totalSubmissions) * 100)}%
                        </span>
                        <span className="text-gray-600 text-sm">معدل النجاح في التحديات</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center pt-2">
                  <Link href="/leaderboard" className="text-indigo-600 text-sm font-medium hover:underline">
                    عرض لوحة المتصدرين
                  </Link>
                </div>
              </div>
            )}

            {/* Courses Tab */}
            {activeTab === "courses" && (
              <div>
                {coursesLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري تحميل الكورسات...</span>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    لم يلتحق هذا المستخدم بأي كورس حتى الآن
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {courses.map((c) => (
                      <Link key={c.id} href={`/courses/${c.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-row-reverse hover:border-indigo-200 transition-colors">
                        <div className="flex-1 text-right">
                          <div className="flex items-center justify-between flex-row-reverse gap-2">
                            <h3 className="font-bold text-gray-900 text-base">{c.title}</h3>
                            {c.completed ? (
                              <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                                مكتمل
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1">
                                قيد المشاهدة
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-3 flex-row-reverse">
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 shrink-0">{c.progress}%</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <div>
                {reposLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري تحميل المشاريع...</span>
                  </div>
                ) : repos.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    لا توجد مشاريع عامة لهذا المستخدم حتى الآن
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {repos.map((repo) => (
                      <div key={repo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start justify-between gap-3 flex-row-reverse">
                          <div className="flex-1 text-right">
                            <h3 className="font-bold text-gray-900 text-base">{repo.title}</h3>
                            {repo.description && (
                              <p className="text-gray-500 text-sm mt-1 leading-relaxed line-clamp-2">{repo.description}</p>
                            )}
                            {repo.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3 justify-end">
                                {repo.technologies.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                                    style={{ backgroundColor: techColor(t) }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex justify-end">
                              <RepoRating
                                repositoryId={repo.id}
                                averageRating={repo.averageRating ?? 0}
                                ratingsCount={repo.ratingsCount ?? 0}
                                isOwner={!!viewer && viewer.id === userId}
                                canRate={!!viewer}
                              />
                            </div>
                          </div>

                          {/* External links: GitHub & live demo */}
                          <div className="flex flex-col gap-2 shrink-0">
                            {repo.repoUrl && (
                              <a
                                href={repo.repoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                              >
                                <ExternalLink size={12} />
                                المستودع
                              </a>
                            )}
                            {repo.liveDemoUrl && (
                              <a
                                href={repo.liveDemoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                              >
                                <Globe size={12} />
                                عرض حي
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Uploaded code files */}
                        {(repo.codeFilesUrls ?? []).length > 0 && (
                          <div className="mt-3 text-right">
                            <p className="text-xs font-semibold text-gray-600">📁 ملفات الأكواد:</p>
                            <div className="flex flex-wrap gap-2 mt-1 justify-end">
                              {(repo.codeFilesUrls ?? []).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-indigo-500 underline"
                                >
                                  <Download size={11} /> ملف {i + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Uploaded PDF files */}
                        {(repo.pdfFilesUrls ?? []).length > 0 && (
                          <div className="mt-2 text-right">
                            <p className="text-xs font-semibold text-gray-600">📄 ملفات PDF:</p>
                            <div className="flex flex-wrap gap-2 mt-1 justify-end">
                              {(repo.pdfFilesUrls ?? []).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-indigo-500 underline"
                                >
                                  <Download size={11} /> PDF {i + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                          <span>{new Date(repo.createdAt).toLocaleDateString("ar-SA")}</span>
                          <span className="flex items-center gap-1 text-green-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                            عام
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
