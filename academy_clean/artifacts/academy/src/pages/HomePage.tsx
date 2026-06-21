import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useGetFeaturedRepositories, useGetPlatformStats, useGetLeaderboard } from "@workspace/api-client-react";
import { Star, Map, Code2, Layers, Users, Trophy, BookOpen, GitBranch } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Link, useLocation } from "wouter";
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 flex-row-reverse justify-center">
      {[5, 4, 3, 2, 1].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          data-testid={`star-${s}`}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            fill={s <= value ? "#f59e0b" : "none"}
            className={s <= value ? "text-amber-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}

const TECH_COLORS: Record<string, string> = {
  "React": "#06b6d4", "Node.js": "#16a34a", "Vue.js": "#10b981", "Python": "#3b82f6",
  "Flutter": "#0284c7", "Django": "#065f46", "MongoDB": "#16a34a", "PostgreSQL": "#2563eb",
  "MySQL": "#f59e0b", "TypeScript": "#3b82f6", "JavaScript": "#f59e0b", "Laravel": "#dc2626",
  "Firebase": "#f97316", "Dart": "#06b6d4", "Socket.io": "#374151", "Express": "#6b7280",
};

export default function HomePage() {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
const [, navigate] = useLocation();

  const { data: repos } = useGetFeaturedRepositories();
  const { data: stats } = useGetPlatformStats();
  useEffect(() => {
    apiFetch("/api/home-reviews")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.reviews ?? []);
        setApprovedReviews(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const handleSubmitReview = async () => {
    if (!rating || !reviewText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/home-reviews", {
        method: "POST",
        // ✅ Fixed: backend validates "reviewer_name" (snake_case) — the previous
        // camelCase key was silently dropped, so the typed name never reached the
        // server and every review fell back to the real account name. Also: leave
        // it blank instead of forcing "زائر" so the backend can treat an empty
        // name as "stay anonymous" rather than a literal display name.
        body: JSON.stringify({ rating, comment: reviewText.trim(), reviewer_name: reviewerName.trim() || null }),
      });
      if (res.ok) {
        setSubmitted(true);
        setRating(0);
        setReviewText("");
        setReviewerName("");
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4c1d95 100%)", minHeight: "520px" }}
      >
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
        <div className="absolute bottom-[-60px] left-10 w-72 h-72 rounded-full opacity-15" style={{ background: "radial-gradient(circle,#60a5fa,transparent)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-right order-1">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
              ابدأ رحلتك في عالم البرمجة مع أفضل المناهج التعليمية التفاعلية
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed mb-8">
              تعلم. تطبق. وتحدى نفسك مع مشاريع حقيقية.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/courses"
                className="rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                style={{ background: "linear-gradient(90deg,#06b6d4,#14b8a6)" }}
                data-testid="link-start-learning"
              >
                ابدأ التعلم مجاناً
              </Link>
              <Link
                href="/roadmap"
                className="rounded-full px-8 py-3.5 text-sm font-bold text-white border-2 border-white/50 hover:bg-white/10 transition-all"
                data-testid="link-explore"
              >
                استكشف الخدمات
              </Link>
            </div>
          </div>

          {/* Code snippets */}
          <div className="order-2 relative hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-sm">
              {/* Main dark card */}
              <div className="bg-gray-900 rounded-2xl p-5 shadow-2xl border border-gray-700 text-left">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <pre className="text-xs leading-relaxed font-mono">
                  <span className="text-purple-400">function </span>
                  <span className="text-yellow-300">welcome</span>
                  <span className="text-white">(</span>
                  <span className="text-orange-300">name</span>
                  <span className="text-white">)</span>
                  <span className="text-white">{" {"}</span>{"\n"}
                  <span className="text-white">  </span>
                  <span className="text-purple-400">return </span>
                  <span className="text-green-400">{"`Hello, ${name}!`"}</span>
                  <span className="text-white">;</span>{"\n"}
                  <span className="text-white">{"}"}</span>{"\n\n"}
                  <span className="text-gray-500">// Python</span>{"\n"}
                  <span className="text-purple-400">def </span>
                  <span className="text-yellow-300">fibonacci</span>
                  <span className="text-white">(n):</span>{"\n"}
                  <span className="text-white">    </span>
                  <span className="text-purple-400">if </span>
                  <span className="text-white">n {"<="} 1: </span>
                  <span className="text-purple-400">return </span>
                  <span className="text-orange-300">n</span>{"\n"}
                  <span className="text-white">    </span>
                  <span className="text-purple-400">return </span>
                  <span className="text-white">fibonacci(n-1)+fibonacci(n-2)</span>
                </pre>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-indigo-600 text-white text-xs font-bold rounded-xl px-3 py-2 shadow-lg">
                JavaScript
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-600 text-white text-xs font-bold rounded-xl px-3 py-2 shadow-lg">
                Python
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="relative bg-white/10 backdrop-blur-sm border-t border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-around flex-wrap gap-4">
              {[
                { icon: <Users size={18} />, value: `${stats.totalUsers?.toLocaleString() ?? "5,000"}+`, label: "مبرمج" },
                { icon: <BookOpen size={18} />, value: `${stats.totalCourses ?? "50"}+`, label: "كورس" },
                { icon: <Trophy size={18} />, value: `${stats.totalChallenges ?? "150"}+`, label: "تحدي" },
                { icon: <GitBranch size={18} />, value: `${stats.totalRepositories ?? "200"}+`, label: "مشروع" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-white">
                  <span className="text-cyan-300">{item.icon}</span>
                  <span className="font-bold text-lg">{item.value}</span>
                  <span className="text-indigo-200 text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">ما الذي نقدمه لك؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Map size={28} className="text-indigo-600" />,
                title: "خارطة طريق شاملة",
                desc: "دليل متكامل لتصبح مبرمج Full Stack محترف من الصفر",
                color: "#3730a3",
              },
              {
                icon: <Layers size={28} className="text-violet-600" />,
                title: "تحديات برمجية",
                desc: "تدرب على تحديات حقيقية تعزز مهاراتك في حل المشكلات",
                color: "#7c3aed",
              },
              {
                icon: <Code2 size={28} className="text-cyan-600" />,
                title: "مشاريع عملية",
                desc: "أنشئ مشاريع حقيقية تضيفها لبروفايلك الاحترافي",
                color: "#0891b2",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                style={{ borderTop: `4px solid ${card.color}` }}
                data-testid={`card-feature-${card.title}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  {card.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Projects */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-2">مشاريع طلابنا</h2>
          <p className="text-gray-500 text-center mb-10">استكشف أبرز المشاريع التي أنجزها طلابنا</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {((Array.isArray(repos) ? repos : (repos as any)?.data ?? (repos as any)?.items ?? []) ?? [])
              .slice(0, 6)
              .map((repo: any) => (
              <div
                key={repo.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow"
                data-testid={`card-repo-${repo.id}`}
              >
                <div className="h-44 relative overflow-hidden">
                  {(repo as any).coverImageUrl ? (
                    <img
                      src={(repo as any).coverImageUrl}
                      alt={repo.title ?? ""}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3)" }}
                    >
                      <Code2 size={48} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                    <button
                      onClick={() => navigate(`/users/${repo.owner?.id ?? repo.owner_id ?? ""}`)}
                      className="rounded-full px-5 py-2 text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(90deg,#06b6d4,#14b8a6)" }}
                    >
                      عرض الملف الشخصي
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {(repo.ownerName ?? repo.owner?.name)?.charAt(0) ?? "م"}
                    </div>
                    <span className="text-sm text-gray-500">{repo.ownerName ?? repo.owner?.name}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="text-xs text-gray-500">
                      {(repo as any).averageRating > 0 ? (repo as any).averageRating.toFixed(1) : "—"} ({(repo as any).ratingsCount ?? 0})
                    </span>
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-right">{repo.title}</h3>
                  <p className="text-gray-500 text-sm mb-3 text-right line-clamp-2">{repo.description}</p>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {(repo.technologies ?? []).map((tech: string) => (
                      <span
                        key={tech}
                        className="text-xs rounded-full px-2.5 py-0.5 font-medium border"
                        style={{ borderColor: TECH_COLORS[tech] ?? "#6b7280", color: TECH_COLORS[tech] ?? "#6b7280" }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">آراء طلابنا</h2>
            <p className="text-gray-500">شاركنا تجربتك وساعد الطلاب الجدد في اتخاذ قراراتهم</p>
          </div>

          {/* Submit form */}
          <div className="max-w-2xl mx-auto mb-10">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <p className="text-green-700 font-semibold text-lg">شكراً على تقييمك! سيتم مراجعة رأيك قبل نشره.</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <p className="text-gray-700 font-medium mb-4 text-center">ما تقييمك للأكاديمية؟</p>
                <StarRating value={rating} onChange={setRating} />
                <input
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="اسمك (اختياري)"
                  className="mt-4 w-full border border-gray-200 rounded-xl p-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="شاركنا برأيك..."
                  rows={4}
                  className="mt-3 w-full border border-gray-200 rounded-xl p-4 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  data-testid="textarea-review"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={!rating || !reviewText.trim() || submitting}
                  className="mt-4 rounded-xl px-8 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                  data-testid="button-submit-review"
                >
                  {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
                </button>
              </div>
            )}
          </div>

          {/* Approved reviews list */}
          {approvedReviews.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {approvedReviews.map((rev) => (
                <div key={rev.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
                      {(rev.reviewerName ?? "م").charAt(0)}
                    </div>
                    <div>
                      {/* Backend now always returns a safe display name — either what the
                          reviewer typed, or "مستخدم مجهول" if they left it blank — never
                          the real account name pulled from a user relation. */}
                      <p className="font-semibold text-gray-800 text-sm">{rev.reviewerName ?? "مستخدم مجهول"}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} size={12} fill={s <= rev.rating ? "#f59e0b" : "none"}
                            className={s <= rev.rating ? "text-amber-400" : "text-gray-300"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}