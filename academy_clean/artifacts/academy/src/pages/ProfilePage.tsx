import { useEffect, useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import Footer from "@/components/layout/Footer";
import { useGetUserStats, useGetLeaderboard, useListCourses } from "@workspace/api-client-react";
import {
  Camera, ChevronDown, Trophy, BookOpen, Code2,
  Star, BarChart2, Shield, User, FolderGit2, Plus, ExternalLink, Loader2, Globe, Trash2,
} from "lucide-react";

type Tab = "personal" | "courses" | "dashboard" | "settings" | "projects";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const validateFiles = (files: File[], allowedExtensions: string[]): string | null => {
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return `الملف ${file.name} حجمه يتجاوز الحد الأقصى (10 ميجابايت)`;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return `الملف ${file.name} له امتداد غير مسموح به. الامتدادات المسموحة: ${allowedExtensions.join(', ')}`;
    }
  }
  return null;
};

export default function ProfilePage() {
  const { user, signOut } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.imageUrl ?? "");
  const [activityLogs, setActivityLogs] = useState([
    "أكملت درساً في كورس الواجهة الأمامية",
    "حللت تحدياً برمجياً",
    "نشرت مشروعاً جديداً",
  ]);
  const [saved, setSaved] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [showNewRepoForm, setShowNewRepoForm] = useState(false);
  const [newRepoTitle, setNewRepoTitle] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoTechs, setNewRepoTechs] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoLive, setNewRepoLive] = useState("");
  const [newRepoSaving, setNewRepoSaving] = useState(false);
  const [codeFiles, setCodeFiles] = useState<File[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newRepoIsPublic, setNewRepoIsPublic] = useState(true);
  const [avatarStamp, setAvatarStamp] = useState(0);
  const [deletingRepoId, setDeletingRepoId] = useState<number | null>(null);
  const [newRepoCoverImage, setNewRepoCoverImage] = useState<File | null>(null);
  const [newRepoCoverImagePreview, setNewRepoCoverImagePreview] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = `${firstName} ${lastName}`.trim() || user?.fullName || "المستخدم";
  const avatarSource = avatarUrl || user?.imageUrl || "";

  const userId = user?.id ?? "";

  const { data: statsData } = useGetUserStats(userId, {
    query: { queryKey: ["user-stats", userId], enabled: !!userId },
  });
  const { data: leaderboardData } = useGetLeaderboard({});
  const { data: coursesData } = useListCourses({});

  const courses = coursesData?.courses ?? [];
  const leaderboard = leaderboardData ?? [];
  const userRank = leaderboard.findIndex((entry) => entry.user?.username === user?.username) + 1;

  const stats = (statsData ?? {
    points: 0,
    coursesCompleted: 0,
    challengesSolved: 0,
    totalSubmissions: 0,
  }) as { points: number; coursesCompleted: number; challengesSolved: number; totalSubmissions: number };
  const points = stats.points;
  const watchedMinutes = useMemo(() => Math.max(0, Math.round(stats.totalSubmissions * 7.5)), [stats.totalSubmissions]);
  const inProgressChallenges = Math.max(0, stats.totalSubmissions - stats.challengesSolved);

  const initials = (user?.firstName?.charAt(0) ?? "") + (user?.lastName?.charAt(0) ?? "");
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long" })
    : "أكتوبر 2025";

  const userEmail = email;
  const isAdmin =
    userEmail.includes("admin") || user?.publicMetadata?.role === "admin";

  useEffect(() => {
    setAvatarUrl(user?.imageUrl ?? "");
  }, [user?.imageUrl]);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user?.id, user?.firstName, user?.lastName]);

  useEffect(() => {
    const syncName = (event: Event) => {
      const detail = (event as CustomEvent<{ firstName?: string | null; lastName?: string | null; imageUrl?: string | null; stamp?: number }>).detail;
      if (!detail) return;
      if (detail.firstName !== undefined) setFirstName(detail.firstName ?? "");
      if (detail.lastName !== undefined) setLastName(detail.lastName ?? "");
      if (detail.imageUrl !== undefined) setAvatarUrl(detail.imageUrl ?? "");
      if (typeof detail.stamp === "number") setAvatarStamp(detail.stamp);
    };
    window.addEventListener("academy:user-updated", syncName as EventListener);
    return () => window.removeEventListener("academy:user-updated", syncName as EventListener);
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, country, bio, avatarUrl }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json() as { user?: { firstName?: string | null; lastName?: string | null; imageUrl?: string } };
      if (data.user) {
        const nextFirst = data.user.firstName ?? firstName;
        const nextLast = data.user.lastName ?? lastName;
        const nextAvatar = data.user.imageUrl ?? "";
        setFirstName(nextFirst);
        setLastName(nextLast);
        setAvatarUrl(nextAvatar);
        const stamp = Date.now();
        setAvatarStamp(stamp);
        window.dispatchEvent(new CustomEvent("academy:user-updated", {
          detail: { firstName: nextFirst, lastName: nextLast, imageUrl: nextAvatar, stamp },
        }));
      }
      setSaved(true);
      setActivityLogs((prev) => ["تم تحديث البيانات الشخصية", ...prev].slice(0, 5));
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(false);
    }
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: form });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json() as { file?: { url: string }; url?: string };
      // API returns { file: { url } }; fall back to top-level url for safety
      const uploadedUrl: string = data?.file?.url ?? (data as any)?.url ?? "";
      if (!uploadedUrl) throw new Error("لم يُعَد URL الصورة من الخادم");
      setAvatarUrl(uploadedUrl);
      const stamp = Date.now();
      setAvatarStamp(stamp);
      // Immediately persist the new avatar URL to the database
      await fetch("/api/users/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadedUrl }),
      });
      window.dispatchEvent(new CustomEvent("academy:user-updated", {
        detail: { imageUrl: uploadedUrl, stamp },
      }));
      setActivityLogs((prev) => ["تم رفع صورة الملف الشخصي", ...prev].slice(0, 5));
    } catch {
      setActivityLogs((prev) => ["فشل رفع الصورة", ...prev].slice(0, 5));
    }
  };

  const ACTIVITY_WEEKS = Array.from({ length: 12 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => (wi + di) % 5)
  );

  const fetchRepos = useCallback(async () => {
    if (!user?.id) return;
    setReposLoading(true);
    try {
      const res = await fetch(`/api/repositories?userId=${encodeURIComponent(user.id)}&limit=50`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { repositories?: any[] };
        setRepos(data.repositories ?? []);
      }
    } catch { /* silent */ } finally { setReposLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === "projects") fetchRepos();
  }, [activeTab, fetchRepos]);

  const handleDeleteRepo = async (repoId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setDeletingRepoId(repoId);
    try {
      const res = await fetch(`/api/repositories/${repoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setRepos((prev) => prev.filter((r) => r.id !== repoId));
        setActivityLogs((prev) => ["تم حذف مشروع", ...prev].slice(0, 5));
      } else {
        alert("فشل حذف المشروع، يرجى المحاولة مجدداً");
      }
    } catch {
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setDeletingRepoId(null);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoTitle.trim() || !user?.id) return;
    setNewRepoSaving(true);
    setUploadingFiles(true);

    try {
      if (codeFiles.length) {
        const codeExts = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'zip', 'tar', 'gz', 'rar'];
        const codeError = validateFiles(codeFiles, codeExts);
        if (codeError) throw new Error(codeError);
      }

      if (pdfFiles.length) {
        const pdfError = validateFiles(pdfFiles, ['pdf']);
        if (pdfError) throw new Error(pdfError);
      }

      let codeUrls: string[] = [];
      if (codeFiles.length > 0) {
        const formData = new FormData();
        codeFiles.forEach(f => formData.append("files", f));
        const uploadRes = await fetch("/api/upload/multiple", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`فشل رفع ملفات الأكواد (${uploadRes.status}): ${errorText.slice(0, 100)}`);
        }
        const data = await uploadRes.json() as { urls: string[] };
        if (!data.urls || !Array.isArray(data.urls)) throw new Error("استجابة غير صالحة من رفع ملفات الأكواد");
        codeUrls = data.urls;
      }

      let pdfUrls: string[] = [];
      if (pdfFiles.length > 0) {
        const formData = new FormData();
        pdfFiles.forEach(f => formData.append("files", f));
        const uploadRes = await fetch("/api/upload/multiple", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`فشل رفع ملفات PDF (${uploadRes.status}): ${errorText.slice(0, 100)}`);
        }
        const data = await uploadRes.json() as { urls: string[] };
        if (!data.urls || !Array.isArray(data.urls)) throw new Error("استجابة غير صالحة من رفع ملفات PDF");
        pdfUrls = data.urls;
      }

      let coverImageUrl: string | null = null;
      if (newRepoCoverImage) {
        const logoFormData = new FormData();
        logoFormData.append("file", newRepoCoverImage);
        const logoRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: logoFormData,
        });
        if (logoRes.ok) {
          const logoData = await logoRes.json() as { file?: { url?: string }; url?: string };
          coverImageUrl = logoData.file?.url ?? logoData.url ?? null;
        }
      }

      const repoRes = await fetch("/api/repositories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRepoTitle.trim(),
          description: newRepoDesc.trim(),
          technologies: newRepoTechs.split(",").map(t => t.trim()).filter(Boolean),
          repoUrl: newRepoUrl.trim() || null,
          liveDemoUrl: newRepoLive.trim() || null,
          codeFilesUrls: codeUrls,
          pdfFilesUrls: pdfUrls,
          coverImageUrl,
          userId: user.id,
          isPublic: newRepoIsPublic,
        }),
      });

      if (!repoRes.ok) {
        const errorData = await repoRes.json().catch(() => ({ message: "خطأ غير معروف" }));
        throw new Error(`فشل حفظ المشروع: ${errorData.message || repoRes.status}`);
      }

      setNewRepoTitle("");
      setNewRepoDesc("");
      setNewRepoTechs("");
      setNewRepoUrl("");
      setNewRepoLive("");
      setCodeFiles([]);
      setPdfFiles([]);
      setNewRepoCoverImage(null);
      setNewRepoCoverImagePreview("");
      setShowNewRepoForm(false);
      fetchRepos();
      setActivityLogs((prev) => [`تمت إضافة مشروع جديد: ${newRepoTitle}`, ...prev].slice(0, 5));
      alert("✅ تم إنشاء المشروع بنجاح");
    } catch (err: any) {
      alert(`❌ حدث خطأ أثناء حفظ المشروع:\n${err.message || "يرجى التحقق من صحة الملفات والمحاولة مرة أخرى"}`);
    } finally {
      setUploadingFiles(false);
      setNewRepoSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]" dir="rtl">
      {/* Profile navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => signOut()}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                data-testid="button-signout"
              >
                تسجيل الخروج
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs"
                style={{ background: "linear-gradient(135deg,#60a5fa,#3730a3)" }}>
                {avatarSource ? (
                  <img key={avatarStamp} src={avatarSource} alt="" className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0) || "م"
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
              <Link href="/profile" className="text-indigo-600 font-semibold" data-testid="link-profile-page">الملف الشخصي</Link>
              <Link href="/community" className="hover:text-indigo-600 transition-colors">المجتمع</Link>
              <Link href="/projects" className="hover:text-indigo-600 transition-colors" data-testid="link-projects-profile">المشاريع</Link>

              <div className="relative" onMouseEnter={() => setCoursesOpen(true)} onMouseLeave={() => setCoursesOpen(false)}>
                <button className="flex items-center gap-1 hover:text-indigo-600 transition-colors" data-testid="nav-courses-profile">
                  الكورسات <ChevronDown size={14} />
                </button>
                {coursesOpen && (
                  <div className="absolute top-6 right-0 bg-white rounded-xl shadow-xl py-2 w-52 z-50 border border-gray-100">
                    {["أساسيات البرمجة", "تطوير الواجهات الأمامية", "تطوير الواجهات الخلفية"].map((c) => (
                      <Link key={c} href="/courses" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 text-right">{c}</Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/roadmap" className="hover:text-indigo-600 transition-colors">خارطة الطريق</Link>
              <Link href="/" className="hover:text-indigo-600 transition-colors">الرئيسية</Link>
            </div>

            <Link href="/" className="flex items-center gap-2" data-testid="link-logo-profile">
              <span className="hidden sm:block font-bold text-gray-900">أكاديمية البرمجة</span>
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm border-2 border-indigo-200">
                {initials || "AP"}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Profile header card */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden mb-6"
          style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3,#4c1d95)" }}
        >
          <div className="p-6 sm:p-8 flex items-start gap-5 sm:gap-8 flex-row-reverse">
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white/20"
                style={{ background: "linear-gradient(135deg,#60a5fa,#818cf8)" }}
              >
                {avatarSource ? <img key={avatarStamp} src={avatarSource} alt="" className="w-full h-full rounded-full object-cover" /> : (initials || "م")}
              </div>
              <button
                className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow"
                data-testid="button-change-avatar"
                onClick={handleAvatarPick}
              >
                <Camera size={13} className="text-indigo-700" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 text-right">
              <div className="flex items-center gap-2 justify-end flex-wrap">
                {isAdmin && (
                  <span className="text-xs bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-full px-2.5 py-1 font-semibold">
                    مسؤول
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-white">{displayName}</h1>
              </div>
              <p className="text-indigo-200 text-sm mt-1">{email}</p>
              <p className="text-indigo-300/70 text-xs mt-0.5">منضم منذ {joinDate}</p>

              <div className="flex gap-5 sm:gap-8 mt-5 flex-row-reverse flex-wrap">
                {[
                  { label: "نقطة", value: stats.points ?? 0, icon: <Star size={14} className="text-amber-300" /> },
                  { label: "تحدي محلول", value: (stats as any).challengesSolved ?? 0, icon: <Code2 size={14} className="text-cyan-300" /> },
                  { label: "التصنيف العالمي", value: userRank > 0 ? `#${userRank}` : "—", icon: <Trophy size={14} className="text-purple-300" /> },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center gap-1.5 justify-center mb-0.5">{s.icon}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-white">{s.value}</div>
                    <div className="text-xs text-indigo-300">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {([
              { key: "dashboard", label: "لوحة النشاط", icon: <BarChart2 size={15} /> },
              { key: "personal", label: "المعلومات الشخصية", icon: <User size={15} /> },
              { key: "courses", label: "الكورسات", icon: <BookOpen size={15} /> },
              { key: "settings", label: "الإعدادات", icon: <Shield size={15} /> },
              { key: "projects", label: "مشاريعي", icon: <FolderGit2 size={15} /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 flex-1 min-w-fit px-4 py-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            {/* ── Dashboard tab ── */}
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold text-gray-900 text-right">لوحة النشاط والإحصاءات</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "إجمالي النقاط", value: points, color: "#3730a3", bg: "#ede9fe" },
                    { label: "التحديات المحلولة", value: (stats as any).challengesSolved ?? 0, color: "#0891b2", bg: "#e0f2fe" },
                    { label: "الكورسات المكتملة", value: (stats as any).coursesCompleted ?? 0, color: "#16a34a", bg: "#dcfce7" },
                    { label: "التصنيف العالمي", value: userRank > 0 ? `#${userRank}` : "—", color: "#dc2626", bg: "#fee2e2" },
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-right">
                    <div className="text-sm text-gray-500">وقت الفيديو المشاهد</div>
                    <div className="text-2xl font-extrabold text-indigo-700">{watchedMinutes} دقيقة</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-right">
                    <div className="text-sm text-gray-500">التحديات قيد التقدم</div>
                    <div className="text-2xl font-extrabold text-emerald-700">{inProgressChallenges}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-right">
                    <div className="text-sm text-gray-500">سجل النشاط</div>
                    <div className="text-2xl font-extrabold text-amber-700">{activityLogs.length}</div>
                  </div>
                </div>

                {leaderboard.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 text-right mb-4 flex items-center gap-2 justify-end">
                      <Trophy size={16} className="text-amber-500" />
                      أفضل المتصدرين
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.slice(0, 5).map((entry, i) => (
                        <div
                          key={entry.user?.id ?? i}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            entry.user?.username === user?.username
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-gray-100 bg-gray-50/50"
                          }`}
                          data-testid={`leaderboard-row-${i}`}
                        >
                          <span className="font-bold text-sm text-gray-500 shrink-0 w-6 text-center">{i + 1}</span>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ background: i === 0 ? "#f59e0b" : i === 1 ? "#9ca3af" : i === 2 ? "#d97706" : "#3730a3" }}
                          >
                            {entry.user?.name?.charAt(0) ?? "م"}
                          </div>
                          <div className="flex-1 text-right">
                            <div className="font-semibold text-gray-900 text-sm">
                              {entry.user?.name}
                              {entry.user?.username === user?.username && (
                                <span className="text-xs text-indigo-500 mr-2">(أنت)</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">@{entry.user?.username}</div>
                          </div>
                          <span className="text-sm font-bold text-indigo-600 shrink-0">{entry.points} نقطة</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-gray-900 text-right mb-4">آخر النشاطات</h3>
                  <div className="space-y-2">
                    {activityLogs.map((log, i) => (
                      <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-right text-sm text-gray-700">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-right mb-4 flex items-center gap-2 justify-end">
                    <BarChart2 size={16} className="text-indigo-400" />
                    نشاط الأشهر الثلاثة الماضية
                  </h3>
                  <div className="flex gap-1 flex-row-reverse flex-wrap">
                    {ACTIVITY_WEEKS.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-1">
                        {week.map((intensity, di) => (
                          <div
                            key={di}
                            className="w-3 h-3 rounded-sm"
                            style={{
                              backgroundColor:
                                intensity === 0 ? "#e5e7eb"
                                : intensity === 1 ? "#c7d2fe"
                                : intensity === 2 ? "#818cf8"
                                : intensity === 3 ? "#4f46e5"
                                : "#312e81",
                            }}
                            title={`${intensity} نشاط`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <div className="w-3 h-3 rounded-sm bg-[#312e81]" />
                    <div className="w-3 h-3 rounded-sm bg-[#818cf8]" />
                    <div className="w-3 h-3 rounded-sm bg-[#c7d2fe]" />
                    <div className="w-3 h-3 rounded-sm bg-gray-200" />
                    <span className="text-xs text-gray-400">أقل</span>
                    <span className="text-xs text-gray-400 mr-1">أكثر نشاطاً</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Personal tab ── */}
            {activeTab === "personal" && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-right">المعلومات الشخصية</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">الاسم الأول</label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="الاسم الأول"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">اسم العائلة</label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="اسم العائلة"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">البريد الإلكتروني</label>
                    <input
                      value={email}
                      readOnly
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right bg-gray-50 text-gray-500"
                      data-testid="input-email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">رقم الهاتف</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="رقم هاتفك"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      data-testid="input-phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">الدولة</label>
                    <div className="relative">
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none bg-white"
                        data-testid="select-country"
                      >
                        <option value="">اختر الدولة</option>
                        {["المملكة العربية السعودية","الإمارات العربية المتحدة","مصر","الأردن","سوريا","العراق","الكويت","المغرب","تونس","الجزائر"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">نبذة عني</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="اكتب نبذة مختصرة عن نفسك..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      data-testid="textarea-bio"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      className="rounded-xl px-8 py-3 text-sm font-bold text-white"
                      style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                      data-testid="button-save"
                    >
                      {saved ? "✓ تم الحفظ" : "حفظ التغييرات"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Courses tab ── */}
            {activeTab === "courses" && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-right">الكورسات المتاحة</h2>
                {courses.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">لا توجد كورسات متاحة حالياً</p>
                    <Link href="/courses" className="inline-block mt-4 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                      data-testid="link-browse-courses">
                      استكشف الكورسات
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {courses.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        href={`/courses/${c.id}`}
                        className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex-row-reverse"
                        data-testid={`profile-course-${c.id}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                          <BookOpen size={18} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 text-right">
                          <div className="font-semibold text-gray-900 text-sm">{c.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{c.category} · {c.creatorName}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Projects tab ── */}
            {activeTab === "projects" && (
              <div className="space-y-5" dir="rtl">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowNewRepoForm(true)}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all"
                    style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }}
                    data-testid="button-new-repo"
                  >
                    <Plus size={15} />
                    مشروع جديد
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">مشاريعي</h2>
                </div>

                {/* New repo form */}
                {showNewRepoForm && (
                  <div className="border border-indigo-200 bg-indigo-50/30 rounded-2xl p-5 space-y-3">
                    <h3 className="font-bold text-gray-800 text-right text-base">إضافة مشروع جديد</h3>

                    {/* Logo upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">لوغو المشروع (اختياري)</label>
                      <div className="flex items-center gap-4">
                        <div
                          className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer group"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {newRepoCoverImagePreview ? (
                            <img src={newRepoCoverImagePreview} alt="logo" className="w-full h-full object-cover" />
                          ) : (
                            <Camera size={24} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={16} className="text-white" />
                          </div>
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setNewRepoCoverImage(f);
                              setNewRepoCoverImagePreview(URL.createObjectURL(f));
                            }
                          }}
                        />
                        <div className="flex-1 text-right">
                          <p className="text-xs text-gray-500">اضغط على المربع لرفع لوغو المشروع</p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG (حد أقصى 5MB)</p>
                          {newRepoCoverImage && (
                            <button
                              type="button"
                              onClick={() => { setNewRepoCoverImage(null); setNewRepoCoverImagePreview(""); }}
                              className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
                            >
                              حذف الصورة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      type="text" placeholder="اسم المشروع *" value={newRepoTitle}
                      onChange={(e) => setNewRepoTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      data-testid="input-repo-title"
                    />
                    <textarea
                      placeholder="وصف المشروع" value={newRepoDesc}
                      onChange={(e) => setNewRepoDesc(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white"
                      data-testid="textarea-repo-desc"
                    />
                    <input
                      type="text" placeholder="التقنيات (مفصولة بفاصلة): React, Node.js, ..." value={newRepoTechs}
                      onChange={(e) => setNewRepoTechs(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      data-testid="input-repo-techs"
                    />
                    <div className="flex gap-3">
                      <input
                        type="url" placeholder="رابط GitHub (اختياري)" value={newRepoUrl}
                        onChange={(e) => setNewRepoUrl(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        data-testid="input-repo-url"
                      />
                      <input
                        type="url" placeholder="رابط العرض الحي (اختياري)" value={newRepoLive}
                        onChange={(e) => setNewRepoLive(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        data-testid="input-repo-live"
                      />
                    </div>

                    {/* Visibility toggle */}
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setNewRepoIsPublic(true)}
                          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${newRepoIsPublic ? "bg-indigo-600 text-white" : "text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                          data-testid="button-visibility-public"
                        >
                          <Globe size={14} /> عام
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRepoIsPublic(false)}
                          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!newRepoIsPublic ? "bg-gray-700 text-white" : "text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                          data-testid="button-visibility-private"
                        >
                          🔒 خاص
                        </button>
                      </div>
                      <span className="text-sm font-medium text-gray-700">مستوى الخصوصية</span>
                    </div>

                    {/* File uploads */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رفع أكواد المشروع (ملفات مضغوطة أو نصية)</label>
                      <input
                        type="file"
                        multiple
                        accept=".js,.ts,.py,.java,.cpp,.c,.html,.css,.zip,.tar,.gz,.rar"
                        onChange={(e) => setCodeFiles(Array.from(e.target.files || []))}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {codeFiles.length > 0 && (
                        <p className="text-xs text-green-600 mt-1 text-right">تم اختيار {codeFiles.length} ملف(ات)</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رفع ملفات PDF (مثل التوثيق)</label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={(e) => setPdfFiles(Array.from(e.target.files || []))}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {pdfFiles.length > 0 && (
                        <p className="text-xs text-green-600 mt-1 text-right">تم اختيار {pdfFiles.length} ملف PDF</p>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => { setShowNewRepoForm(false); setCodeFiles([]); setPdfFiles([]); setNewRepoCoverImage(null); setNewRepoCoverImagePreview(""); }}
                        className="rounded-full px-5 py-2 text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50"
                        data-testid="button-cancel-repo"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleCreateRepo}
                        disabled={newRepoSaving || uploadingFiles || !newRepoTitle.trim()}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }}
                        data-testid="button-save-repo"
                      >
                        {(newRepoSaving || uploadingFiles) && <Loader2 size={14} className="animate-spin" />}
                        حفظ المشروع
                      </button>
                    </div>
                  </div>
                )}

                {/* Repos list */}
                {reposLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-indigo-500" />
                  </div>
                ) : repos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <FolderGit2 size={32} className="text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">لا توجد مشاريع بعد</p>
                      <p className="text-sm text-gray-400 mt-1">أضف مشروعك الأول وشاركه مع المجتمع</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {repos.map((repo: any) => (
                      <div
                        key={repo.id}
                        className="border border-gray-200 rounded-2xl overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all group bg-white"
                        data-testid={`repo-card-${repo.id}`}
                      >
                        {repo.coverImageUrl && (
                          <div className="w-full h-36 overflow-hidden bg-gray-100">
                            <img
                              src={repo.coverImageUrl}
                              alt={repo.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex gap-2 shrink-0 items-center">
                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteRepo(repo.id)}
                              disabled={deletingRepoId === repo.id}
                              className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="حذف المشروع"
                              data-testid={`button-delete-repo-${repo.id}`}
                            >
                              {deletingRepoId === repo.id
                                ? <Loader2 size={15} className="animate-spin text-red-400" />
                                : <Trash2 size={15} />
                              }
                            </button>
                            {repo.repoUrl && (
                              <a href={repo.repoUrl} target="_blank" rel="noreferrer"
                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                                data-testid={`repo-github-${repo.id}`}>
                                <ExternalLink size={15} />
                              </a>
                            )}
                            {repo.liveDemoUrl && (
                              <a href={repo.liveDemoUrl} target="_blank" rel="noreferrer"
                                className="text-gray-400 hover:text-green-600 transition-colors"
                                data-testid={`repo-live-${repo.id}`}>
                                <Globe size={15} />
                              </a>
                            )}
                          </div>
                          <div className="text-right flex-1">
                            <div className="flex items-center gap-2 justify-end">
                              <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">
                                {repo.title}
                              </h3>
                              <FolderGit2 size={15} className="text-indigo-400 shrink-0" />
                            </div>
                            {repo.description && (
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{repo.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Privacy badge */}
                        <div className="flex justify-end mb-2">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${repo.isPublic ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                            {repo.isPublic ? "🌐 عام" : "🔒 خاص"}
                          </span>
                        </div>

                        {repo.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 justify-end mt-2">
                            {(repo.technologies as string[]).slice(0, 5).map((tech: string) => (
                              <span key={tech} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2.5 py-0.5 font-medium">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}

                        {repo.codeFilesUrls?.length > 0 && (
                          <div className="mt-2 text-right">
                            <p className="text-xs font-semibold text-gray-600">📁 ملفات الأكواد:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {repo.codeFilesUrls.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 underline">ملف {idx + 1}</a>
                              ))}
                            </div>
                          </div>
                        )}

                        {repo.pdfFilesUrls?.length > 0 && (
                          <div className="mt-2 text-right">
                            <p className="text-xs font-semibold text-gray-600">📄 ملفات PDF:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {repo.pdfFilesUrls.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 underline">PDF {idx + 1}</a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Star size={11} />
                            <span>{repo.likes ?? 0}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {repo.createdAt ? new Date(repo.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short" }) : ""}
                          </span>
                        </div>
                        </div>{/* end p-5 */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Settings tab ── */}
            {activeTab === "settings" && (
              <div className="space-y-5 text-right">
                <h2 className="text-xl font-bold text-gray-900">إعدادات الحساب</h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <button onClick={() => signOut()} className="text-sm font-semibold text-red-600 hover:text-red-700" data-testid="button-signout-settings">
                      تسجيل الخروج
                    </button>
                    <span className="text-sm text-gray-700 font-medium">تسجيل الخروج من الحساب</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-between p-4 border border-purple-100 bg-purple-50/40 rounded-xl">
                      <Link href="/admin" className="text-sm font-semibold text-purple-600 hover:text-purple-700" data-testid="link-admin-settings">
                        فتح لوحة التحكم
                      </Link>
                      <span className="text-sm text-purple-700 font-medium">لوحة التحكم الإدارية</span>
                    </div>
                  )}

                  <div className="p-4 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono bg-gray-100 px-3 py-1.5 rounded-lg text-gray-500">
                        {user?.id?.slice(0, 20)}...
                      </span>
                      <span className="text-sm text-gray-700 font-medium">معرّف الحساب (ID)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
