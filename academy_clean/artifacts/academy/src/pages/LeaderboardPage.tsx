import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy } from "lucide-react";

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7c2a"];
const AVATAR_COLORS = ["#3730a3", "#7c3aed", "#0891b2", "#16a34a", "#e11d48", "#f59e0b", "#0d9488"];

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useGetLeaderboard({ query: { queryKey: ["leaderboard", "full"] } });

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="لوحة المتصدرين"
        subtitle="أفضل المبرمجين والمتعلمين على منصتنا — تحدَّ نفسك وارتقِ في الترتيب"
      />

      <section className="max-w-4xl mx-auto w-full px-4 py-12">
        <div
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3)" }}
        >
          <div className="px-6 py-5 border-b border-white/20">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <Trophy size={22} className="text-amber-400" />
              أفضل المبرمجين
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-white/60">جاري التحميل...</div>
          ) : (
            <div className="divide-y divide-white/10">
              {(leaderboard ?? []).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
                  data-testid={`row-leaderboard-${idx}`}
                >
                  {/* Rank */}
                  <div className="w-10 flex items-center justify-center shrink-0">
                    {idx < 3 ? (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: RANK_COLORS[idx] + "33", border: `2px solid ${RANK_COLORS[idx]}`, color: RANK_COLORS[idx] }}
                      >
                        {idx + 1}
                      </div>
                    ) : (
                      <span className="text-white/60 font-semibold text-sm">{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                  >
                    {entry.user?.name?.charAt(0) ?? "م"}
                  </div>

                  {/* Name */}
                  <div className="flex-1 text-right">
                    <div className="text-white font-semibold">{entry.user?.name ?? `مستخدم ${idx + 1}`}</div>
                    <div className="text-white/50 text-xs">@{entry.user?.username ?? `user${idx + 1}`}</div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <div className="text-amber-400 font-bold">{entry.points?.toLocaleString() ?? 0}</div>
                    <div className="text-white/50 text-xs">نقطة</div>
                  </div>
                </div>
              ))}

              {(!leaderboard || leaderboard.length === 0) && (
                <div className="p-8 text-center text-white/60">لا توجد بيانات</div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}
