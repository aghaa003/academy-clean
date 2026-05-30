import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { ExternalLink, Users, Code2, Star, Cpu, Zap, MessageSquare } from "lucide-react";

const PLATFORM_FILTERS = ["الكل", "العالمية", "العربية", "للمبتدئين", "للمتقدمين"];

interface Platform {
  id: string;
  name: string;
  rating: number;
  color: string;
  initials: string;
  desc: string;
  tags: string[];
  users: string;
  challenges: string;
  url: string;
  type: string[];
}

const PLATFORMS: Platform[] = [
  {
    id: "leetcode",
    name: "LeetCode",
    rating: 4.8,
    color: "#f97316",
    initials: "L",
    desc: "منصة رائدة في تحضير مقابلات العمل التقنية. تحتوي على آلاف المشاكل البرمجية مع حلول مفصلة ومناقشات.",
    tags: ["هياكل البيانات", "خوارزميات", "مقابلات العمل"],
    users: "+5M",
    challenges: "+2000",
    url: "https://leetcode.com",
    type: ["العالمية", "للمتقدمين"],
  },
  {
    id: "hackerrank",
    name: "HackerRank",
    rating: 4.6,
    color: "#3b82f6",
    initials: "H",
    desc: "منصة شاملة للمبرمجين من جميع المستويات. تقدم تحديات برمجية ومسابقات وفرص عمل مع الشركات العالمية.",
    tags: ["مسابقات", "تحديات", "فرص عمل"],
    users: "+7M",
    challenges: "+1500",
    url: "https://hackerrank.com",
    type: ["العالمية", "للمبتدئين"],
  },
  {
    id: "barmaj",
    name: "برمج",
    rating: 4.7,
    color: "#10b981",
    initials: "ب",
    desc: "منصة عربية متخصصة في تعليم البرمجة للمبتدئين والمتوسطين. تقدم محتوى عربياً حصرياً ومسابقات دورية.",
    tags: ["عربي", "مبتدئين", "مسابقات"],
    users: "+100K",
    challenges: "+500",
    url: "https://barmej.com",
    type: ["العربية", "للمبتدئين"],
  },
  {
    id: "codeforces",
    name: "Codeforces",
    rating: 4.5,
    color: "#dc2626",
    initials: "C",
    desc: "منصة عالمية مخصصة للمسابقات البرمجية ذات المستوى العالي. مثالية للمتقدمين الراغبين في المنافسة.",
    tags: ["مسابقات", "خوارزميات", "متقدم"],
    users: "+2M",
    challenges: "+3000",
    url: "https://codeforces.com",
    type: ["العالمية", "للمتقدمين"],
  },
];

const COMPARISON_ROWS = [
  { label: "اللغة", values: ["إنجليزي", "إنجليزي", "عربي", "إنجليزي"] },
  { label: "المستوى", values: ["متقدم", "جميع المستويات", "مبتدئ-متوسط", "متقدم"] },
  { label: "المسابقات", values: ["نعم", "نعم", "نعم", "نعم"] },
  { label: "المجتمع", values: ["نشط", "نشط", "نشط", "نشط"] },
  { label: "مجاني", values: ["نعم", "نعم", "نعم", "نعم"] },
];

const RECOMMENDATIONS: Record<string, { platform: string; reason: string; color: string }[]> = {
  مبتدئ: [
    { platform: "برمج", reason: "محتوى عربي مناسب للمبتدئين وشروحات تفصيلية", color: "#10b981" },
    { platform: "HackerRank", reason: "مسارات تعليمية منظمة لمختلف المستويات", color: "#3b82f6" },
  ],
  متوسط: [
    { platform: "HackerRank", reason: "تحديات متنوعة وفرص عمل حقيقية", color: "#3b82f6" },
    { platform: "LeetCode", reason: "مثالي للتحضير لمقابلات الشركات الكبرى", color: "#f97316" },
  ],
  متقدم: [
    { platform: "LeetCode", reason: "أصعب المسائل وأكثرها تنوعاً", color: "#f97316" },
    { platform: "Codeforces", reason: "مسابقات عالمية على أعلى مستوى", color: "#dc2626" },
  ],
};

export default function ProblemSolvingPage() {
  const [activeFilter, setActiveFilter] = useState("الكل");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const filteredPlatforms = PLATFORMS.filter(
    (p) => activeFilter === "الكل" || p.type.includes(activeFilter)
  );

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="مواقع حل المشاكل البرمجية"
        subtitle="اكتشف أفضل المنصات العالمية والعربية لحل المشاكل البرمجية، واختبر مهاراتك، وتعلم من خلال التحديات التفاعلية"
      />

      {/* Platforms */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
            أفضل منصات حل المشاكل البرمجية
          </h2>
          <div className="w-16 h-1 bg-indigo-600 rounded-full mx-auto mb-8" />

          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {PLATFORM_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  activeFilter === f
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
                data-testid={`platform-filter-${f}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlatforms.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
                data-testid={`card-platform-${p.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <Star size={14} fill="#f59e0b" className="text-amber-400" />
                    <span className="text-sm font-semibold text-gray-700">{p.rating}</span>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.initials}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-xl mb-2 text-right">{p.name}</h3>
                <p className="text-gray-500 text-sm mb-4 text-right leading-relaxed">{p.desc}</p>
                <div className="flex flex-wrap gap-1.5 justify-end mb-4">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs border border-indigo-200 text-indigo-600 rounded-full px-2.5 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Code2 size={14} className="text-indigo-400" />
                    <span>{p.challenges} تحدي</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} className="text-indigo-400" />
                    <span>{p.users} مستخدم</span>
                  </div>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white"
                  style={{ background: `linear-gradient(90deg,${p.color}cc,${p.color})` }}
                  data-testid={`link-platform-${p.id}`}
                >
                  <ExternalLink size={14} />
                  زيارة الموقع
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">مقارنة بين المنصات</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "linear-gradient(90deg,#1e1b4b,#3730a3)" }}>
                  <th className="py-4 px-5 text-right text-white font-semibold">الميزة</th>
                  {["LeetCode", "HackerRank", "برمج", "Codeforces"].map((name) => (
                    <th key={name} className="py-4 px-4 text-center text-white font-semibold">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {COMPARISON_ROWS.map((row, ri) => (
                  <tr key={row.label} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-3.5 px-5 text-right font-semibold text-gray-700">{row.label}</td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="py-3.5 px-4 text-center">
                        {val === "نعم" || val === "نشط" ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                            <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-xs">✓</span>
                            {val}
                          </span>
                        ) : (
                          <span className="text-gray-600">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why section */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">لماذا تستخدم منصات حل المشاكل؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: <Cpu size={28} className="text-indigo-600" />, title: "تطوير التفكير الخوارزمي", desc: "تحسين قدرتك على تحليل المشاكل وإيجاد حلول فعالة ومنهجية", color: "#3730a3" },
              { icon: <Zap size={28} className="text-amber-500" />, title: "تحسين سرعة البرمجة", desc: "التدرب المستمر يجعلك أسرع وأكثر كفاءة في كتابة الكود", color: "#f59e0b" },
              { icon: <MessageSquare size={28} className="text-teal-600" />, title: "التعلم من المجتمع", desc: "الاستفادة من حلول المبرمجين الآخرين وتوسيع آفاقك التقنية", color: "#0d9488" },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                style={{ borderTop: `4px solid ${card.color}` }}
                data-testid={`card-why-${card.title}`}
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

      {/* Smart Recommender */}
      <section
        className="py-16 px-4"
        style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3,#4c1d95)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-white mb-2">أداة التوصية الذكية</h2>
          <p className="text-indigo-200 mb-8">أخبرنا عن مستواك ونوصيك بأفضل منصة تناسبك</p>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <p className="font-bold text-gray-800 mb-5 text-lg">ما هو مستواك في البرمجة؟</p>
            <div className="flex gap-3 justify-center flex-wrap mb-6">
              {["مبتدئ", "متوسط", "متقدم"].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded-full px-8 py-3 font-bold text-sm transition-all ${
                    selectedLevel === level
                      ? "text-white shadow-md scale-105"
                      : "border-2 border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                  style={selectedLevel === level ? { background: "linear-gradient(90deg,#3730a3,#7c3aed)" } : {}}
                  data-testid={`level-${level}`}
                >
                  {level}
                </button>
              ))}
            </div>

            {selectedLevel && RECOMMENDATIONS[selectedLevel] && (
              <div className="space-y-3">
                <p className="text-gray-600 font-medium mb-3">توصياتنا لك:</p>
                {RECOMMENDATIONS[selectedLevel].map((rec) => (
                  <div
                    key={rec.platform}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 text-right"
                    data-testid={`recommendation-${rec.platform}`}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{rec.platform}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{rec.reason}</div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: rec.color }}
                    >
                      {rec.platform.charAt(0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Chatbot button */}
      <button
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-40"
        style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}
        data-testid="button-chatbot"
      >
        <MessageSquare size={22} />
      </button>

      <Footer />
    </div>
  );
}
