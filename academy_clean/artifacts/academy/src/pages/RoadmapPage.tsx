import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type PathKey = "basics" | "frontend" | "backend";

const PATHS: { key: PathKey; label: string; sublabel?: string; color: string; bgColor: string; icon: string }[] = [
  { key: "basics", label: "أساسيات البرمجة", color: "#0d9488", bgColor: "#ccfbf1", icon: "⬡" },
  { key: "frontend", label: "Frontend Developer", color: "#7c3aed", bgColor: "#ede9fe", icon: "🎨" },
  { key: "backend", label: "Backend Developer", color: "#e11d48", bgColor: "#ffe4e6", icon: "⚙" },
];

const PATH_DATA: Record<PathKey, { title: string; subtitle: string; color: string; borderColor: string; techs: { name: string; desc: string; color: string; icon: string }[] }> = {
  basics: {
    title: "مسار أساسيات البرمجة",
    subtitle: "تعلم أساسيات البرمجة وبناء قاعدة متينة لرحلتك التقنية",
    color: "#0d9488",
    borderColor: "#0d9488",
    techs: [
      { name: "Python", desc: "لغة برمجة مثالية للمبتدئين، بسيطة وقوية في نفس الوقت", color: "#3b82f6", icon: "🐍" },
      { name: "Scratch", desc: "بيئة برمجة مرئية لتعليم أساسيات البرمجة بطريقة ممتعة", color: "#f59e0b", icon: "🎯" },
      { name: "الخوارزميات", desc: "تعلم التفكير المنطقي وحل المشكلات بطريقة منهجية وفعالة", color: "#10b981", icon: "🔢" },
      { name: "هياكل البيانات", desc: "فهم كيفية تنظيم وتخزين البيانات بكفاءة في البرامج", color: "#8b5cf6", icon: "📊" },
      { name: "Git & GitHub", desc: "إدارة الكود المصدري والتعاون مع الفرق البرمجية", color: "#374151", icon: "🔗" },
      { name: "Linux أساسيات", desc: "فهم بيئة العمل وسطر الأوامر الأساسية في أنظمة Linux", color: "#f97316", icon: "🐧" },
    ],
  },
  frontend: {
    title: "مسار Frontend Developer",
    subtitle: "تخصص في تطوير الواجهات الأمامية للمواقع والتطبيقات باستخدام أحدث التقنيات",
    color: "#7c3aed",
    borderColor: "#7c3aed",
    techs: [
      { name: "HTML5", desc: "لغة ترميز القاسم الأساسية لإنشاء هيكل صفحات الويب", color: "#e11d48", icon: "🅗" },
      { name: "CSS3", desc: "لغة تنسيق لتصميم وتخطيط صفحات الويب وجعلها جذابة بصريًا", color: "#3b82f6", icon: "🅒" },
      { name: "JavaScript", desc: "لغة برمجة لتطوير الواجهات التفاعلية وتطبيقات الويب الديناميكية", color: "#f59e0b", icon: "🅙" },
      { name: "React", desc: "مكتبة JavaScript لبناء واجهات المستخدم التفاعلية والقابلة لإعادة الاستخدام", color: "#06b6d4", icon: "⚛" },
      { name: "Angular", desc: "إطار عمل قوي ومتكامل لبناء تطبيقات الويب الديناميكية", color: "#dc2626", icon: "🅐" },
      { name: "Vue.js", desc: "إطار عمل تقدمي لبناء واجهات المستخدم وتطبيقات الصفحة الواحدة", color: "#10b981", icon: "🅥" },
    ],
  },
  backend: {
    title: "مسار Backend Developer",
    subtitle: "تخصص في تطوير الخوادم وقواعد البيانات والمنطق الخلفي للتطبيقات والمواقع",
    color: "#e11d48",
    borderColor: "#e11d48",
    techs: [
      { name: "Node.js", desc: "بيئة تشغيل JavaScript من جانب الخادم لبناء تطبيقات الويب سريعة وقابلة للتوسع في التطوير", color: "#10b981", icon: "🟢" },
      { name: "Python & Django", desc: "لغة Python مع إطار عمل Django لبناء تطبيقات ويب قوية وآمنة", color: "#3b82f6", icon: "🐍" },
      { name: "Java & Spring", desc: "لغة Java مع إطار عمل Spring لتطوير تطبيقات المؤسسات الكبيرة", color: "#e11d48", icon: "☕" },
      { name: "قواعد البيانات", desc: "MySQL, PostgreSQL, MongoDB لإدارة البيانات وتخزينها بفعالية", color: "#0ea5e9", icon: "🗃" },
      { name: "خدمات السحابة", desc: "AWS, Azure, Google Cloud لنشر وإدارة التطبيقات في السحابة", color: "#f97316", icon: "☁" },
      { name: "الأمان", desc: "ممارسات أمنية لحماية التطبيقات والبيانات من التهديدات الإلكترونية", color: "#8b5cf6", icon: "🔐" },
    ],
  },
};

export default function RoadmapPage() {
  const [selectedPath, setSelectedPath] = useState<PathKey | null>(null);

  const selectedData = selectedPath ? PATH_DATA[selectedPath] : null;
  const selectedMeta = selectedPath ? PATHS.find((p) => p.key === selectedPath) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 px-4 text-center"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4c1d95 100%)" }}
      >
        <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
        <div className="absolute bottom-[-40px] left-[-40px] w-56 h-56 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#60a5fa,transparent)" }} />
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">خارطة الطريق البرمجية</h1>
          <p className="text-lg text-indigo-200 leading-relaxed">
            ابدأ رحلتك في عالم البرمجة من خلال مسارات تعليمية محددة وواضحة. اختر المسار الذي
            يناسب اهتماماتك وابدأ التعلم اليوم!
          </p>

          {/* Path circles */}
          <div className="flex justify-center gap-10 mt-12 flex-wrap">
            {PATHS.map((path) => (
              <button
                key={path.key}
                onClick={() => setSelectedPath(selectedPath === path.key ? null : path.key)}
                data-testid={`button-path-${path.key}`}
                className="flex flex-col items-center gap-3 group"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110 shadow-lg"
                  style={{
                    backgroundColor: selectedPath === path.key ? path.color : path.bgColor,
                    border: selectedPath === path.key ? `3px solid white` : `3px solid transparent`,
                  }}
                >
                  <span style={{ color: selectedPath === path.key ? "white" : path.color }}>{path.icon}</span>
                </div>
                <span className="text-white font-semibold text-sm">{path.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Path detail */}
      {selectedData && selectedMeta && (
        <section className="max-w-5xl mx-auto w-full px-4 py-12">
          <div
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
            style={{ borderRight: `6px solid ${selectedData.borderColor}` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedData.title}</h2>
                <p className="text-gray-500 mt-1 text-sm">{selectedData.subtitle}</p>
              </div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: selectedMeta.bgColor }}
              >
                <span style={{ color: selectedMeta.color }}>{selectedMeta.icon}</span>
              </div>
            </div>

            {/* Technologies grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {selectedData.techs.map((tech) => (
                <div
                  key={tech.name}
                  className="border border-gray-100 rounded-xl p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                  data-testid={`card-tech-${tech.name}`}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3"
                    style={{ backgroundColor: tech.color + "22" }}
                  >
                    <span style={{ color: tech.color }}>{tech.icon}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{tech.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            {PATHS.findIndex((p) => p.key === selectedPath) < PATHS.length - 1 && (
              <button
                onClick={() => {
                  const idx = PATHS.findIndex((p) => p.key === selectedPath);
                  setSelectedPath(PATHS[idx + 1].key);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
                data-testid="button-next-path"
              >
                المسار التالي
                <span>&#x2193;</span>
              </button>
            )}
            {PATHS.findIndex((p) => p.key === selectedPath) > 0 && (
              <button
                onClick={() => {
                  const idx = PATHS.findIndex((p) => p.key === selectedPath);
                  setSelectedPath(PATHS[idx - 1].key);
                }}
                className="flex items-center gap-2 border border-indigo-600 text-indigo-600 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-indigo-50 transition-colors mr-auto"
                data-testid="button-prev-path"
              >
                <span>&#x2191;</span>
                المسار السابق
              </button>
            )}
          </div>
        </section>
      )}

      {!selectedPath && (
        <div className="max-w-5xl mx-auto w-full px-4 py-16 text-center text-gray-400">
          <p className="text-lg">اختر مساراً من الأعلى لعرض التفاصيل</p>
        </div>
      )}

      <div className="flex-1" />
      <Footer />
    </div>
  );
}
