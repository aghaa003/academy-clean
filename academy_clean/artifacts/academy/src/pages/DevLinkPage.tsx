import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { useGlobalSearch, useListUsers } from "@workspace/api-client-react";
import { ExternalLink, Search, Github, Globe, Code2, Users, BookOpen } from "lucide-react";

const RESOURCES = [
  {
    category: "توثيق رسمي",
    items: [
      { name: "MDN Web Docs", desc: "مرجع شامل لـ HTML و CSS و JavaScript", url: "https://developer.mozilla.org", icon: "📚", color: "#0891b2" },
      { name: "React Docs", desc: "توثيق React الرسمي بالكامل", url: "https://react.dev", icon: "⚛", color: "#06b6d4" },
      { name: "Node.js Docs", desc: "دليل Node.js الرسمي", url: "https://nodejs.org/docs", icon: "🟢", color: "#16a34a" },
    ],
  },
  {
    category: "أدوات التطوير",
    items: [
      { name: "GitHub", desc: "منصة إدارة الكود ومشاركته مع المطورين", url: "https://github.com", icon: "🐙", color: "#374151" },
      { name: "CodePen", desc: "بيئة تطوير ويب تفاعلية على الإنترنت", url: "https://codepen.io", icon: "✒", color: "#dc2626" },
      { name: "VS Code", desc: "محرر الكود الأكثر استخداماً في العالم", url: "https://code.visualstudio.com", icon: "💙", color: "#3b82f6" },
    ],
  },
  {
    category: "مجتمعات المطورين",
    items: [
      { name: "Stack Overflow", desc: "أكبر مجتمع للإجابة على أسئلة البرمجة", url: "https://stackoverflow.com", icon: "⚡", color: "#f59e0b" },
      { name: "Dev.to", desc: "منصة مجتمع للمطورين لمشاركة المقالات", url: "https://dev.to", icon: "🔵", color: "#3730a3" },
      { name: "Discord", desc: "مجتمعات البرمجة العربية على ديسكورد", url: "https://discord.com", icon: "💜", color: "#7c3aed" },
    ],
  },
];

const AVATAR_COLORS = ["#3730a3", "#7c3aed", "#0891b2", "#16a34a", "#e11d48", "#f59e0b"];

export default function DevLinkPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: searchResults } = useGlobalSearch(
    { q: searchQuery },
    { query: { queryKey: ["global-search", searchQuery], enabled: searchQuery.length > 1 } }
  );

  const { data: usersData } = useListUsers({ query: { queryKey: ["devlink-users"] } });
  const users = usersData?.users ?? [];

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="DevLink — بوابة المطورين"
        subtitle="الدليل الشامل للمطورين العرب: ابحث عن المبرمجين، اكتشف الموارد، وتواصل مع مجتمع البرمجة"
      />

      {/* Global Search */}
      <section className="bg-white py-10 px-4 border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-5">البحث الشامل</h2>
          <p className="text-gray-500 text-center text-sm mb-6">ابحث عن مستخدمين بالاسم أو الرقم التعريفي، أو عن كورسات وصانعي محتوى</p>
          <div className="relative">
            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="ابحث عن مستخدم، كورس، أو صانع محتوى..."
              className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl pr-12 pl-4 py-4 text-right text-sm focus:outline-none transition-colors"
              data-testid="input-global-search"
            />
          </div>

          {/* Search results */}
          {searchQuery.length > 1 && searchFocused && searchResults && (
            <div className="mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {searchResults.users && searchResults.users.length > 0 && (
                <div>
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 justify-end">
                    <span className="text-xs font-semibold text-gray-500">المستخدمون</span>
                    <Users size={14} className="text-gray-400" />
                  </div>
                  {searchResults.users.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 flex-row-reverse" data-testid={`search-user-${u.id}`}>
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {u.name?.charAt(0) ?? "م"}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                        <div className="text-xs text-gray-400">@{u.username} · ID: {u.id?.slice(0, 8)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.courses && searchResults.courses.length > 0 && (
                <div>
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 justify-end">
                    <span className="text-xs font-semibold text-gray-500">الكورسات</span>
                    <BookOpen size={14} className="text-gray-400" />
                  </div>
                  {searchResults.courses.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 cursor-pointer flex-row-reverse" data-testid={`search-course-${c.id}`}>
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <BookOpen size={14} className="text-indigo-600" />
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 text-sm">{c.title}</div>
                        <div className="text-xs text-gray-400">{c.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!searchResults.users?.length && !searchResults.courses?.length) && (
                <div className="p-6 text-center text-gray-400 text-sm">لا توجد نتائج مطابقة</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Developers directory */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-2">مجتمع المطورين</h2>
          <p className="text-gray-500 text-center mb-8 text-sm">كل مستخدم له رقم تعريفي فريد</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.slice(0, 9).map((u, idx) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 flex-row-reverse hover:shadow-md transition-shadow"
                data-testid={`card-dev-${u.id}`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                >
                  {u.name?.charAt(0) ?? "م"}
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className="font-bold text-gray-900 truncate">{u.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">@{u.username}</div>
                  <div className="text-xs text-gray-300 mt-0.5 font-mono">ID: {u.id?.slice(0, 12)}...</div>
                  <div className="flex items-center gap-3 mt-2 justify-end">
                    <span className="text-xs text-indigo-600 font-semibold">{u.points} نقطة</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === "admin" ? "bg-red-50 text-red-600" :
                      u.role === "creator" ? "bg-purple-50 text-purple-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>{u.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-2">موارد المطورين</h2>
          <p className="text-gray-500 text-center mb-10 text-sm">روابط مختارة للمطورين العرب</p>
          <div className="space-y-10">
            {RESOURCES.map((section) => (
              <div key={section.category}>
                <h3 className="font-bold text-gray-700 text-right mb-4 flex items-center gap-2 justify-end">
                  <Code2 size={16} className="text-indigo-400" />
                  {section.category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {section.items.map((item) => (
                    <a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-3 hover:shadow-md hover:border-indigo-200 transition-all group flex-row-reverse"
                      data-testid={`resource-${item.name}`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: item.color + "18" }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <ExternalLink size={12} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                          <span className="font-bold text-gray-900">{item.name}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
