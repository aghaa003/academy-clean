import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { apiFetch } from "@/lib/api-fetch";
import { Search, ChevronDown, ChevronUp, Code2, Copy, Terminal, Check } from "lucide-react";

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

interface ExampleItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  code: string;
  install_command: string | null;
  technologies: string[] | null;
}

export default function ExamplesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("الكل");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchExamples = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (activeFilter !== "الكل") params.set("category", activeFilter);

    apiFetch(`/api/examples?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { examples: [] }))
      .then((data) => setExamples(Array.isArray(data?.examples) ? data.examples : []))
      .catch(() => setExamples([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(fetchExamples, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard not available */
    }
  };

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

          {/* Examples grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : examples.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">لا توجد أمثلة مطابقة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {examples.map((item, index) => {
                const diff = DIFFICULTY_MAP[index % 3];
                const isExpanded = expandedId === item.id;
                return (
                  <div key={item.id} className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl border border-indigo-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold rounded-full px-2.5 py-1"
                          style={{ backgroundColor: diff.bg, color: diff.text }}
                        >
                          {diff.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100 rounded-full px-3 py-1">{item.category}</span>
                      <Code2 size={18} className="text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-right mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 text-right leading-relaxed mb-3">{item.description}</p>
                    )}
                    {item.technologies && item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end mb-3">
                        {item.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="text-xs rounded-full px-2.5 py-0.5 border font-medium"
                            style={{ borderColor: TECH_COLORS[tech] ?? "#6b7280", color: TECH_COLORS[tech] ?? "#6b7280" }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative bg-gray-900 rounded-xl p-4 text-[11px] font-mono text-green-400 overflow-x-auto">
                      <button
                        onClick={() => handleCopy(item.code, `code-${item.id}`)}
                        className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 text-white px-2 py-1 text-[10px] transition-colors"
                        data-testid={`button-copy-code-${item.id}`}
                      >
                        {copiedKey === `code-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                        {copiedKey === `code-${item.id}` ? "تم النسخ" : "نسخ"}
                      </button>
                      <pre className={isExpanded ? "" : "max-h-32 overflow-hidden"}>{item.code}</pre>
                    </div>

                    {item.code.split("\n").length > 6 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full mt-2 flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600 rounded-xl py-2 text-sm font-semibold hover:bg-indigo-50 transition-colors"
                        data-testid={`button-show-code-${item.id}`}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? "إخفاء الكود" : "عرض الكود كاملاً"}
                      </button>
                    )}

                    {item.install_command && (
                      <div className="relative mt-3 flex items-center justify-between gap-2 bg-gray-100 rounded-xl px-3 py-2 text-left" dir="ltr">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Terminal size={14} className="text-gray-500 shrink-0" />
                          <code className="text-xs text-gray-700 truncate">{item.install_command}</code>
                        </div>
                        <button
                          onClick={() => handleCopy(item.install_command!, `install-${item.id}`)}
                          className="shrink-0 flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-[10px] transition-colors"
                          data-testid={`button-copy-install-${item.id}`}
                        >
                          {copiedKey === `install-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                          {copiedKey === `install-${item.id}` ? "تم" : "تثبيت"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
