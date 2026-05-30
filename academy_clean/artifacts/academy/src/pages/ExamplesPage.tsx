import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { useListRepositories } from "@workspace/api-client-react";
import { Search, ChevronDown, ChevronUp, Code2 } from "lucide-react";

const FILTERS = ["الكل", "Frontend", "Backend", "تطبيقات الجوال", "الخوارزميات"];

const DIFFICULTY_MAP: { label: string; bg: string; text: string }[] = [
  { label: "مبتدئ", bg: "#dcfce7", text: "#16a34a" },
  { label: "متوسط", bg: "#fef9c3", text: "#ca8a04" },
  { label: "متقدم", bg: "#fee2e2", text: "#dc2626" },
];

const TECH_COLORS: Record<string, string> = {
  "React": "#06b6d4", "Node.js": "#16a34a", "Vue.js": "#10b981", "Python": "#3b82f6",
  "Flutter": "#0284c7", "Django": "#065f46", "MongoDB": "#16a34a", "PostgreSQL": "#2563eb",
  "MySQL": "#f59e0b", "TypeScript": "#3b82f6", "JavaScript": "#f59e0b", "Laravel": "#dc2626",
  "Firebase": "#f97316", "Dart": "#06b6d4", "Socket.io": "#374151", "Express": "#6b7280",
};

const FEATURED_EXAMPLES = [
  {
    title: "بناء صفحة تسجيل دخول",
    description: "مثال عملي يوضح إنشاء نموذج تسجيل دخول متجاوب مع React وTypeScript.",
    category: "Frontend",
    code: `import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
    </form>
  );
}`,
  },
  {
    title: "REST API بسيطة",
    description: "مثال يشرح كيفية إنشاء نقطة نهاية GET باستخدام Node.js وExpress.",
    category: "Backend",
    code: `import express from "express";

const app = express();

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from API" });
});`,
  },
  {
    title: "لوحة بيانات تفاعلية",
    description: "مثال يوضح عرض إحصائيات أساسية باستخدام React ومكونات قابلة لإعادة الاستخدام.",
    category: "Frontend",
    code: `const stats = [
  { label: "المشاريع", value: 12 },
  { label: "الطلاب", value: 48 },
  { label: "الإنجازات", value: 27 },
];`,
  },
  {
    title: "استعلام SQL لعرض المستخدمين",
    description: "مثال عملي لقراءة البيانات من جدول المستخدمين بترتيب تنازلي.",
    category: "Backend",
    code: `SELECT id, name, email
FROM users
ORDER BY created_at DESC;`,
  },
  {
    title: "قالب صفحة هبوط",
    description: "مثال سريع لصفحة هبوط HTML وCSS مع قسم رئيسي وزر دعوة لاتخاذ إجراء.",
    category: "تطبيقات الجوال",
    code: `<section class="hero">
  <h1>تعلم البرمجة</h1>
  <button>ابدأ الآن</button>
</section>`,
  },
];

export default function ExamplesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("الكل");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useListRepositories({ query: { queryKey: ["repositories"] } });
  const repos = data?.repositories ?? [];

  const filtered = repos.filter((r) =>
    (!search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.description ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  const featuredExamples = FEATURED_EXAMPLES.filter((item) =>
    activeFilter === "الكل" ? true : item.category === activeFilter || item.title.includes(activeFilter)
  );

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="أمثلة وتطبيقات وشروحات"
        subtitle="استكشف مجموعة متنوعة من الأمثلة البرمجية والتطبيقات العملية والشروحات التفصيلية لتعزيز مهاراتك البرمجية"
      />

      <section className="bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 inline-block relative mb-2">
              استكشف أمثلة برمجية متنوعة
              <div className="absolute bottom-0 right-0 left-0 h-0.5 rounded-full bg-indigo-600 mt-1" />
            </h2>
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
            <div className="relative w-full max-w-md">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مثال أو تطبيق..."
                className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                data-testid="input-search-examples"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    activeFilter === f
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                  data-testid={`filter-${f}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {featuredExamples.map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl border border-indigo-100 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 rounded-full px-3 py-1">{item.category}</span>
                  <Code2 size={18} className="text-indigo-500" />
                </div>
                <h3 className="font-bold text-gray-900 text-right mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 text-right leading-relaxed mb-4">{item.description}</p>
                <div className="bg-gray-900 rounded-xl p-4 text-[11px] font-mono text-green-400 overflow-x-auto">
                  <pre>{item.code}</pre>
                </div>
              </div>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((repo, idx) => {
                const diff = DIFFICULTY_MAP[idx % 3];
                const isExpanded = expandedId === repo.id;
                return (
                  <div
                    key={repo.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                    data-testid={`card-example-${repo.id}`}
                  >
                    {/* Image */}
                    <div
                      className="h-40 relative flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3)" }}
                    >
                      <Code2 size={36} className="text-white/20" />
                      <div
                        className="absolute top-3 right-3 text-xs font-bold rounded-full px-2.5 py-1"
                        style={{ backgroundColor: diff.bg, color: diff.text }}
                      >
                        {diff.label}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-end mb-2">
                        <span className="text-xs font-semibold border border-indigo-200 text-indigo-600 rounded-full px-2.5 py-1">
                          {repo.technologies?.[0] ?? "برمجة"}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1.5 text-right">{repo.title}</h3>
                      <p className="text-gray-500 text-sm mb-3 text-right line-clamp-2">{repo.description}</p>
                      <div className="flex flex-wrap gap-1.5 justify-end mb-4">
                        {(repo.technologies ?? []).map((tech) => (
                          <span
                            key={tech}
                            className="text-xs rounded-full px-2.5 py-0.5 border font-medium"
                            style={{ borderColor: TECH_COLORS[tech] ?? "#6b7280", color: TECH_COLORS[tech] ?? "#6b7280" }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : repo.id)}
                        className="w-full flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-50 transition-colors"
                        data-testid={`button-show-code-${repo.id}`}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        عرض الكود
                      </button>
                      {isExpanded && (
                        <div className="mt-3 bg-gray-900 rounded-xl p-4 text-xs font-mono text-green-400 text-left overflow-x-auto">
                          <pre>{`// ${repo.title}\n// تقنيات: ${(repo.technologies ?? []).join(", ")}\n\nfunction main() {\n  console.log("مرحباً!");\n}\n\nmain();`}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-400">
                  <p className="text-lg font-medium">لا توجد نتائج مطابقة</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
