import { useState } from "react";
import { Link } from "wouter";
import { useLocation, useSearch } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { useListCourses } from "@workspace/api-client-react";
import { Star, BookOpen, Search } from "lucide-react";

const CATEGORIES = ["الكل", "البرمجة", "تطوير الويب", "تطبيقات الجوال", "علوم البيانات"];
const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  beginner: { bg: "#dcfce7", text: "#16a34a", label: "مبتدئ" },
  intermediate: { bg: "#fef9c3", text: "#ca8a04", label: "متوسط" },
  advanced: { bg: "#fee2e2", text: "#dc2626", label: "متقدم" },
};

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [, navigate] = useLocation();
  const queryString = useSearch();

  const { data, isLoading } = useListCourses();
  const courses = data?.courses ?? [];
  const urlCategory = new URLSearchParams(queryString).get("category");
  const selectedCategory = urlCategory ?? activeCategory;

  const filtered = courses.filter((c) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "الكل" || c.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="الكورسات"
        subtitle="استكشف مجموعة واسعة من الكورسات البرمجية المصممة لجميع المستويات"
      />

      <section className="max-w-7xl mx-auto w-full px-4 py-12">
        {/* Search & filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن كورس..."
              className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
              data-testid="input-search-courses"
            />
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  if (urlCategory) navigate("/courses");
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
                data-testid={`filter-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-72 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => {
              const levelInfo = LEVEL_COLORS[course.level] ?? LEVEL_COLORS.beginner;
              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  data-testid={`card-course-${course.id}`}
                >
                  <div
                    className="h-40 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1e1b4b,#3730a3)" }}
                  >
                    <BookOpen size={40} className="text-white/30" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-semibold rounded-full px-2.5 py-1"
                        style={{ backgroundColor: levelInfo.bg, color: levelInfo.text }}
                      >
                        {levelInfo.label}
                      </span>
                      <span className="text-xs text-indigo-600 font-semibold border border-indigo-200 rounded-full px-2.5 py-1">
                        {course.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-right leading-snug">{course.title}</h3>
                    <p className="text-gray-500 text-xs mb-3 text-right line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-2 mb-4 flex-row-reverse">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {course.creatorName?.charAt(0) ?? "م"}
                      </div>
                      <span className="text-xs text-gray-500">{course.creatorName}</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <Star size={14} fill="#f59e0b" className="text-amber-400" />
                        <span className="text-xs font-semibold text-gray-700">
                          {Number(course.averageRating).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">({course.totalReviews})</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <BookOpen size={12} />
                        <span>{course.totalLessons} درس</span>
                      </div>
                    </div>
                    <Link
                      href={`/courses/${course.id}`}
                      className="w-full rounded-full py-2.5 text-sm font-bold text-white block text-center"
                      style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                      data-testid={`button-enroll-${course.id}`}
                    >
                      الانضمام للكورس
                    </Link>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <p className="text-lg font-medium">لا توجد كورسات مطابقة</p>
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
