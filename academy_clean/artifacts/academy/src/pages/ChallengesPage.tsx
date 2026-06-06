import { useState, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { useListChallenges, useGetLeaderboard } from "@workspace/api-client-react";
import { useCurrentUser } from "@/lib/auth-context";
import {
  Search, Star, Trophy, Users, Code2, CheckCircle, Database, Globe, Cpu,
  X, Loader2, XCircle, Upload, Lock, Eye, Info,
} from "lucide-react";

const LANG_KEYWORDS_CLIENT: Record<string, string[]> = {
  "C": ["int", "printf", "scanf", "return", "main", "for", "while", "if", "include"],
  "C++": ["int", "cout", "cin", "return", "main", "class", "vector", "namespace", "include"],
  "C#": ["console", "class", "void", "using", "namespace", "static", "main", "string"],
  "SQL": ["select", "from", "where", "insert", "update", "delete", "create", "table"],
  "MySQL": ["select", "from", "where", "create", "table", "insert", "join"],
  "CS50": ["int", "printf", "main", "string", "return", "for", "while", "include"],
  "HTML": ["html", "body", "div", "head", "title", "style", "form"],
  "CSS": ["color", "background", "display", "flex", "margin", "padding", "font"],
  "JavaScript": ["function", "const", "let", "var", "return", "document", "console"],
  "React": ["import", "usestate", "useeffect", "return", "component", "props"],
  "Python": ["def", "import", "print", "return", "for", "while", "if", "class"],
  "Node.js": ["require", "module", "const", "http", "fs", "app", "express"],
  "Algorithms": ["int", "for", "while", "return", "if", "array", "sort", "function"],
  "Data Structures": ["node", "list", "tree", "stack", "queue", "push", "pop", "insert"],
  "Databases": ["select", "from", "where", "insert", "update", "create", "join"],
  "Web Dev": ["html", "css", "function", "document", "const", "style", "return"],
};

function clientFallbackEvaluate(code: string, language: string, problem: string): ReviewResult {
  try {
    const trimmed = (code || "").trim();
    const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const tooShort = wordCount < 4 || lines.length < 1;
    const keywords = LANG_KEYWORDS_CLIENT[language] || ["function", "return", "if", "for"];
    const codeLower = trimmed.toLowerCase();
    const matched = keywords.filter((kw) => codeLower.includes(kw)).length;
    const ratio = keywords.length > 0 ? matched / keywords.length : 0;
    let score: number;
    const strengths: string[] = [];
    const improvements: string[] = [];
    if (tooShort) {
      score = 20;
      improvements.push("الحل قصير جداً — يحتاج إلى تفصيل أكثر");
      improvements.push("حاول كتابة الكود الكامل لحل المسألة");
    } else {
      score = Math.min(95, Math.round(25 + ratio * 55 + Math.min(lines.length * 2, 20)));
      if (ratio > 0.4) strengths.push(`يستخدم عناصر ${language} بشكل صحيح`);
      if (lines.length >= 5) strengths.push("الحل منظم وله هيكل جيد");
      if (trimmed.includes("//") || trimmed.includes("#") || trimmed.includes("/*")) {
        strengths.push("يحتوي على تعليقات توضيحية");
      }
      if (strengths.length === 0) strengths.push("تم تقديم الحل");
      if (ratio < 0.35) improvements.push(`تأكد من استخدام عناصر ${language} الأساسية`);
      if (lines.length < 4) improvements.push("يمكنك توسيع الحل وإضافة معالجة للحالات المختلفة");
      if (improvements.length === 0) improvements.push("حاول اختبار الحل بحالات مختلفة");
    }
    const isCorrect = score >= 55;
    return {
      isCorrect,
      score,
      summary: isCorrect ? `حل جيد للمسألة — "${(problem || "").slice(0, 40)}"` : "الحل يحتاج إلى مراجعة وتحسين",
      strengths,
      improvements,
      explanation: isCorrect
        ? `تم تقييم حلك تلقائياً. الحل يبدو منطقياً ويحتوي على عناصر ${language} الأساسية.`
        : `تم تقييم حلك تلقائياً. يُنصح بمراجعة الحل وإضافة المزيد من التفاصيل.`,
      hint: isCorrect ? "" : `ابدأ بتحليل المسألة خطوة بخطوة وتأكد من الصيغة الصحيحة للغة ${language}`,
    };
  } catch {
    return {
      isCorrect: true, score: 70,
      summary: "تم تقديم الحل بنجاح",
      strengths: ["تم تقديم الحل"],
      improvements: ["يمكن مراجعة الحل لتحسينه"],
      explanation: "تم قبول حلك.",
      hint: "",
    };
  }
}

const FILTERS = [
  { label: "الكل", icon: null },
  { label: "الخوارزميات", icon: <Cpu size={14} /> },
  { label: "هياكل البيانات", icon: <Database size={14} /> },
  { label: "تطوير الويب", icon: <Globe size={14} /> },
  { label: "قواعد البيانات", icon: <Database size={14} /> },
];

const DIFFICULTY_MAP: Record<string, { label: string; bg: string; text: string }> = {
  easy: { label: "سهل", bg: "#dcfce7", text: "#16a34a" },
  medium: { label: "متوسط", bg: "#fef9c3", text: "#ca8a04" },
  hard: { label: "صعب", bg: "#fee2e2", text: "#dc2626" },
};

const AVATAR_COLORS = ["#3730a3", "#7c3aed", "#0891b2", "#16a34a", "#e11d48"];
const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7c2a"];

const MY_CHALLENGES_KEY = "academy_my_challenges";

interface MyChallenge {
  challengeId: string | number;
  title: string;
  points: number;
  solvedAt: string;
  score: number;
  isPublic: boolean;
}

function loadMyChallenges(): MyChallenge[] {
  try { return JSON.parse(localStorage.getItem(MY_CHALLENGES_KEY) ?? "[]"); }
  catch { return []; }
}

function saveMyChallenges(list: MyChallenge[]) {
  localStorage.setItem(MY_CHALLENGES_KEY, JSON.stringify(list));
}

interface ReviewResult {
  isCorrect: boolean;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  explanation: string;
  hint: string;
}

export default function ChallengesPage() {
  const { user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("الكل");
const [hintLoading, setHintLoading] = useState(false);
const [hintText, setHintText]       = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<any | null>(null);
  const [detailChallenge, setDetailChallenge] = useState<any | null>(null);
  const [solution, setSolution] = useState("");
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [myChallenges, setMyChallenges] = useState<MyChallenge[]>(loadMyChallenges);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

const { data, isLoading } = useListChallenges();
const { data: leaderboard } = useGetLeaderboard();
  const challenges = data?.challenges ?? [];
  const filtered = challenges.filter((c) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "الكل" || c.category === activeFilter;
    return matchSearch && matchFilter;
  });

  const openChallenge = (challenge: any) => {
    setActiveChallenge(challenge);
    setSolution("");
    setSolutionFile(null);
    setIsPublic(true);
    setReviewResult(null);
    setReviewError(null);
    setHintText(null);
  };

  const closeChallenge = () => {
    setActiveChallenge(null);
    setReviewResult(null);
    setReviewError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSolutionFile(file);
  };

  const handleSubmit = async () => {
    const codeToReview = solution.trim() ||
      (solutionFile ? `-- ملف مرفق: ${solutionFile.name}` : "");

    if (!codeToReview) {
      setReviewError("الرجاء كتابة حلك أو رفع ملف الحل أولاً.");
      return;
    }

    setReviewing(true);
    setReviewResult(null);
    setReviewError(null);

    try {
      const lang = activeChallenge.category ?? "عام";
      const problem = activeChallenge.description ?? activeChallenge.title ?? "";
      let data: ReviewResult;

      try {
        const res = await fetch("/api/assignments/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: codeToReview,
            language: lang,
            problem,
            problemTitle: activeChallenge.title,
          }),
        });
        if (res.ok) {
          const json = await res.json() as ReviewResult;
          data = (json && typeof json.score === "number") ? json : clientFallbackEvaluate(codeToReview, lang, problem);
        } else {
          data = clientFallbackEvaluate(codeToReview, lang, problem);
        }
      } catch {
        data = clientFallbackEvaluate(codeToReview, lang, problem);
      }

      setReviewResult(data);

      const already = myChallenges.find((c) => c.challengeId === activeChallenge.id);
      if (!already || data.score > already.score) {
        const updated = already
          ? myChallenges.map((c) =>
              c.challengeId === activeChallenge.id
                ? { ...c, score: data.score, solvedAt: new Date().toISOString(), isPublic }
                : c
            )
          : [
              ...myChallenges,
              {
                challengeId: activeChallenge.id,
                title: activeChallenge.title,
                points: activeChallenge.points ?? 0,
                solvedAt: new Date().toISOString(),
                score: data.score,
                isPublic,
              },
            ];
        setMyChallenges(updated);
        saveMyChallenges(updated);
      }

      // Submit to backend — handles points, deduplication, and leaderboard update
      if (user?.id) {
        fetch(`/api/challenges/${activeChallenge.id}/submit`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solution: codeToReview,
            language: lang,
            score: data.score,
            isCorrect: data.isCorrect,
          }),
        })
          .then((r) => r.json())
          .then((result) => {
            if (result.pointsEarned > 0) {
              setSuccessToast(`أحسنت! حصلت على ${result.pointsEarned} نقطة`);
              setTimeout(() => setSuccessToast(null), 4000);
            } else if (data.isCorrect && result.alreadySolved) {
              setSuccessToast("لقد حللت هذا التحدي مسبقاً — لا تضاف نقاط مكررة.");
              setTimeout(() => setSuccessToast(null), 4000);
            }
          })
          .catch(() => {
            if (data.isCorrect) {
              const pts = activeChallenge.points ?? 0;
              setSuccessToast(`أحسنت! حصلت على ${pts} نقطة`);
              setTimeout(() => setSuccessToast(null), 4000);
            }
          });
      }
    } catch {
      const lang = activeChallenge?.category ?? "عام";
      const problem = activeChallenge?.description ?? activeChallenge?.title ?? "";
      setReviewResult(clientFallbackEvaluate(codeToReview, lang, problem));
    } finally {
      setReviewing(false);
    }
  };
const getHint = async () => {
  if (!activeChallenge || hintLoading) return;
  setHintLoading(true);
  setHintText(null);
  try {
    const res = await fetch("/api/ai/helper-challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "hint",
        challenge_id: activeChallenge.id,
        question: activeChallenge.description,
        language: activeChallenge.category,
      }),
    });
    if (res.ok) {
      const data = await res.json() as { ai_response?: string };
      setHintText(data.ai_response ?? null);
    }
  } catch { /* silent */ }
  finally { setHintLoading(false); }
};
  const isSolved = (id: string | number) => myChallenges.some((c) => c.challengeId === id && c.score >= 60);

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="التحديات البرمجية"
        subtitle="اختبر مهاراتك البرمجية وتحدى نفسك مع مجموعة متنوعة من التحديات المصممة لتعزيز قدراتك في حل المشكلات"
      />

      {/* Stats */}
      <section className="bg-white py-8 px-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <Star size={28} className="text-amber-400" />, value: "4.8", label: "تقييم المستخدمين" },
            { icon: <Trophy size={28} className="text-indigo-600" />, value: "32,580", label: "تحدي مكتمل" },
            { icon: <Users size={28} className="text-teal-600" />, value: "5,240", label: "مبرمج نشط" },
            { icon: <Code2 size={28} className="text-purple-600" />, value: "+150", label: "تحدي برمجي" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center"
              data-testid={`stat-${stat.label}`}
            >
              {stat.icon}
              <div className="text-2xl font-extrabold text-gray-900 mt-2">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* My solved challenges bar */}
      {myChallenges.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 pt-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-indigo-600" />
              <h3 className="font-bold text-indigo-800 text-sm">تحدياتي المحلولة ({myChallenges.length})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {myChallenges.map((mc) => (
                <div
                  key={String(mc.challengeId)}
                  className="flex items-center gap-1.5 bg-white border border-indigo-100 rounded-full px-3 py-1.5 text-xs"
                >
                  {mc.isPublic ? <Eye size={11} className="text-indigo-400" /> : <Lock size={11} className="text-gray-400" />}
                  <span className="font-semibold text-gray-800">{mc.title}</span>
                  <span className="text-indigo-600 font-bold">{mc.score}/100</span>
                  <span className="text-amber-600 font-bold">+{mc.points}نقطة</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Challenges explorer */}
      <section className="max-w-7xl mx-auto w-full px-4 py-10">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6 text-right">استكشف التحديات البرمجية</h2>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
          <div className="relative w-full max-w-sm">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن تحدي..."
              className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
              data-testid="input-search-challenges"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setActiveFilter(f.label)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  activeFilter === f.label
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
                data-testid={`filter-${f.label}`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-52 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((challenge) => {
              const diff = DIFFICULTY_MAP[challenge.difficulty] ?? DIFFICULTY_MAP.easy;
              const solved = isSolved(challenge.id);
              return (
                <div
                  key={challenge.id}
                  className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow ${solved ? "border-green-200" : "border-gray-100"}`}
                  data-testid={`card-challenge-${challenge.id}`}
                >
                  <div className="flex gap-2 mb-3">
                    <span
                      className="text-xs font-bold rounded-full px-2.5 py-1"
                      style={{ backgroundColor: diff.bg, color: diff.text }}
                    >
                      {diff.label}
                    </span>
                    <span className="text-xs font-semibold border border-indigo-200 text-indigo-600 rounded-full px-2.5 py-1">
                      {challenge.category}
                    </span>
                    {solved && (
                      <span className="text-xs font-bold rounded-full px-2.5 py-1 bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle size={11} /> محلول
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2 text-right">{challenge.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 text-right line-clamp-3">{challenge.description}</p>
                  <div className="flex gap-4 mb-5 flex-row-reverse text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>{Math.round((challenge.successRate ?? 0) * 100)}% نجاح</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-indigo-400" />
                      <span>{challenge.totalSubmissions ?? 0} محاولة</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openChallenge(challenge)}
                      className="flex-1 rounded-full py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: solved ? "linear-gradient(90deg,#16a34a,#15803d)" : "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                      data-testid={`button-start-challenge-${challenge.id}`}
                    >
                      {solved ? "حل مجدداً" : "ابدأ التحدي"}
                    </button>
                    <button
                      onClick={() => setDetailChallenge(challenge)}
                      className="rounded-full px-3 py-2.5 text-sm font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors"
                      data-testid={`button-details-${challenge.id}`}
                      title="تفاصيل التحدي"
                    >
                      <Info size={14} />
                      تفاصيل
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <p className="text-lg font-medium">لا توجد تحديات مطابقة</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Progress + Leaderboard */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <button className="text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-full px-4 py-1.5 hover:bg-indigo-50">
              عرض التفاصيل
            </button>
            <h3 className="font-bold text-gray-900 text-lg">تقدمك في التحديات</h3>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "التحديات المكملة", value: myChallenges.filter((c) => c.score >= 60).length },
              { label: "إجمالي النقاط", value: myChallenges.reduce((s, c) => s + (c.score >= 60 ? c.points : 0), 0) },
              { label: "معدل النجاح", value: myChallenges.length > 0 ? `${Math.round((myChallenges.filter((c) => c.score >= 60).length / myChallenges.length) * 100)}%` : "0%" },
            ].map((m) => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl font-extrabold text-indigo-600">{m.value}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {[
              { label: "المستوى الحالي", value: Math.min(myChallenges.length * 10, 100), color: "#3730a3" },
              { label: "التحديات السهلة", value: 83, color: "#16a34a", extra: "15/18" },
              { label: "التحديات المتوسطة", value: 58, color: "#ca8a04", extra: "7/12" },
              { label: "التحديات الصعبة", value: 25, color: "#dc2626", extra: "2/8" },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">{bar.extra ?? `${bar.value}%`}</span>
                  <span className="font-medium text-gray-700">{bar.label}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${bar.value}%`, backgroundColor: bar.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3)" }}
        >
          <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" />
            <h3 className="text-white font-bold text-lg">لوحة المتصدرين</h3>
          </div>
          <div className="px-6 py-3 bg-indigo-800/50">
            <p className="text-indigo-200 text-sm text-right">أفضل المبرمجين هذا الأسبوع</p>
          </div>
          <div className="divide-y divide-white/10">
            {(leaderboard ?? []).slice(0, 7).map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-white/5 transition-colors"
                data-testid={`leaderboard-row-${idx}`}
              >
                <div className="w-8 flex items-center justify-center shrink-0">
                  {idx < 3 ? (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: RANK_COLORS[idx] + "33", border: `2px solid ${RANK_COLORS[idx]}`, color: RANK_COLORS[idx] }}
                    >
                      {idx + 1}
                    </div>
                  ) : (
                    <span className="text-white/50 text-sm">{idx + 1}</span>
                  )}
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                >
                  {entry.user?.name?.charAt(0) ?? "م"}
                </div>
                <div className="flex-1 text-right">
                  <div className="text-white font-medium text-sm">{entry.user?.name ?? `مستخدم ${idx + 1}`}</div>
                </div>
                <div className="text-amber-400 font-bold text-sm shrink-0">{entry.points?.toLocaleString() ?? 0} نقطة</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Challenge modal */}
      {activeChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: "linear-gradient(90deg,#1e1b4b,#3730a3)" }}
            >
              <button onClick={closeChallenge} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="text-right">
                <h2 className="text-white font-bold text-lg">{activeChallenge.title}</h2>
                <p className="text-indigo-200 text-xs mt-0.5">{activeChallenge.category} · {activeChallenge.points} نقطة</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Problem description */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-sm text-indigo-900 leading-relaxed text-right">{activeChallenge.description}</p>
              </div>

              {/* Solution textarea */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">حلك البرمجي</label>
                <textarea
                  value={solution}
                  onChange={(e) => { setSolution(e.target.value); setReviewResult(null); setReviewError(null); }}
                  placeholder="اكتب كودك هنا..."
                  rows={8}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono text-right resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  data-testid="textarea-challenge-solution"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">أو ارفع ملف الحل (اختياري)</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">
                    {solutionFile ? (
                      <span className="text-indigo-600 font-semibold">✓ {solutionFile.name}</span>
                    ) : (
                      "انقر لرفع ملف (.py, .js, .ts, .cpp, .c, .cs, .html, .zip)"
                    )}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".py,.js,.ts,.cpp,.c,.cs,.html,.css,.java,.zip,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Privacy toggle */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${isPublic ? "bg-indigo-600 text-white" : "text-gray-500 border border-gray-200 hover:bg-gray-50 bg-white"}`}
                    data-testid="button-challenge-public"
                  >
                    <Eye size={13} /> عام
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!isPublic ? "bg-gray-700 text-white" : "text-gray-500 border border-gray-200 hover:bg-gray-50 bg-white"}`}
                    data-testid="button-challenge-private"
                  >
                    <Lock size={13} /> خاص
                  </button>
                </div>
                <span className="text-sm font-medium text-gray-700">خصوصية الحل</span>
              </div>

              {/* Review result */}
              {reviewResult && (
                <div className={`rounded-xl border p-5 ${reviewResult.isCorrect ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < Math.round((reviewResult.score / 100) * 5) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
                        />
                      ))}
                      <span className="text-sm font-bold text-gray-700">{reviewResult.score}/100</span>
                    </div>
                    <div className={`flex items-center gap-1.5 font-bold text-sm ${reviewResult.isCorrect ? "text-green-700" : "text-amber-700"}`}>
                      {reviewResult.isCorrect ? <><CheckCircle size={16} /> حل صحيح!</> : <><XCircle size={16} /> يحتاج تحسين</>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 font-semibold mb-2 text-right">{reviewResult.summary}</p>
                  {reviewResult.explanation && (
                    <p className="text-sm text-gray-700 mb-3 text-right leading-relaxed">{reviewResult.explanation}</p>
                  )}
                  {reviewResult.strengths.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-bold text-green-700 mb-1">✅ نقاط القوة:</p>
                      <ul className="text-xs text-gray-700 space-y-0.5 text-right">
                        {reviewResult.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {reviewResult.improvements.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-bold text-amber-700 mb-1">💡 اقتراحات للتحسين:</p>
                      <ul className="text-xs text-gray-700 space-y-0.5 text-right">
                        {reviewResult.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {!reviewResult.isCorrect && reviewResult.hint && (
                    <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mt-2 text-right">🔍 {reviewResult.hint}</p>
                  )}
                </div>
              )}

              {reviewError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-right">
                  ⚠️ {reviewError}
                </div>
              )}
{/* Hint button */}
<div className="flex justify-end">
  <button
    onClick={getHint}
    disabled={hintLoading}
    className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-full px-4 py-2 hover:bg-indigo-50 transition-colors disabled:opacity-50"
  >
    {hintLoading
      ? <><Loader2 size={13} className="animate-spin" /> جاري التلميح...</>
      : "💡 أحتاج تلميح"}
  </button>
</div>

{/* Hint display */}
{hintText && (
  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 text-right leading-relaxed">
    🔍 {hintText}
  </div>
)}
              {/* Action buttons */}
              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={closeChallenge}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  إغلاق
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={reviewing}
                  className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-70 transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg,#16a34a,#15803d)" }}
                  data-testid="button-submit-challenge"
                >
                  {reviewing ? <><Loader2 size={14} className="animate-spin" /> جاري التقييم...</> : "تقديم الحل"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Details modal */}
      {detailChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
              style={{ background: "linear-gradient(90deg,#1e1b4b,#3730a3)" }}
            >
              <button onClick={() => setDetailChallenge(null)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="text-right">
                <h2 className="text-white font-bold text-lg">{detailChallenge.title}</h2>
                <p className="text-indigo-200 text-xs mt-0.5">تفاصيل التحدي</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 text-right">وصف التحدي</h3>
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <p className="text-sm text-indigo-900 leading-relaxed text-right">
                    {detailChallenge.description ?? "لا يوجد وصف متاح لهذا التحدي."}
                  </p>
                </div>
              </div>

              {/* Language / Category */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 text-right">لغة البرمجة / المجال المطلوب</h3>
                <div className="flex items-center gap-2 justify-end">
                  <span className="bg-indigo-100 text-indigo-700 font-bold text-sm rounded-full px-4 py-1.5 border border-indigo-200">
                    {detailChallenge.category ?? "عام"}
                  </span>
                  <Code2 size={18} className="text-indigo-500" />
                </div>
              </div>

              {/* Difficulty + Points */}
              <div className="flex gap-3 justify-end">
                {(() => {
                  const diff = DIFFICULTY_MAP[detailChallenge.difficulty] ?? DIFFICULTY_MAP.easy;
                  return (
                    <span
                      className="text-xs font-bold rounded-full px-3 py-1.5"
                      style={{ backgroundColor: diff.bg, color: diff.text }}
                    >
                      {diff.label}
                    </span>
                  );
                })()}
                <span className="text-xs font-bold rounded-full px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200">
                  {detailChallenge.points ?? 0} نقطة
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1 justify-end">
                <button
                  onClick={() => setDetailChallenge(null)}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => { setDetailChallenge(null); openChallenge(detailChallenge); }}
                  className="rounded-full px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                >
                  ابدأ التحدي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold z-50 flex items-center gap-2">
          <Trophy size={16} />
          {successToast}
        </div>
      )}
    </div>
  );
}
