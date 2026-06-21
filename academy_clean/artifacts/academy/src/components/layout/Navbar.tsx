import { useState, useRef, useEffect, useCallback } from "react";
  import { Link, useLocation } from "wouter";
  import { useCurrentUser } from "@/lib/auth-context";
  import { Menu, X, ChevronDown, Code2, ShieldCheck, User, PenSquare, Search, Bell, FolderGit2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

  const LEARN_DROPDOWN = [
    { label: "أمثلة وتطبيقات وشروحات", href: "/examples" },
    { label: "التحديات البرمجية", href: "/challenges" },
    { label: "مواقع حل المشاكل البرمجية", href: "/problemsolving" },
    { label: "مجتمع المبرمجين", href: "/community" },
  ];

  const COURSES_DROPDOWN = [
    { label: "جميع الكورسات", href: "/courses" },
    { label: "أساسيات البرمجة", href: "/courses?category=البرمجة" },
    { label: "تطوير الواجهات الأمامية", href: "/courses?category=تطوير الويب" },
    { label: "تطوير الواجهات الخلفية", href: "/courses?category=البرمجة" },
    { label: "تطوير تطبيقات الجوال", href: "/courses?category=تطبيقات الجوال" },
    { label: "علوم البيانات", href: "/courses?category=علوم البيانات" },
  ];

  interface SearchResult {
    users: { id: string; name?: string; username?: string }[];
    courses: { id: string | number; title?: string; category?: string }[];
    repositories: { id: string | number; title?: string; description?: string; owner?: { id: string; name?: string; username?: string } }[];
  }

  function useDebounce<T>(value: T, ms: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), ms);
      return () => clearTimeout(handler);
    }, [value, ms]);
    return debouncedValue;
  }

  export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [learnOpen, setLearnOpen] = useState(false);
    const [coursesOpen, setCoursesOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [location, navigate] = useLocation();
    const { user, signOut } = useCurrentUser();
    const learnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const coursesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const debouncedQuery = useDebounce(searchQuery, 300);

    // Recent search history — last 10 terms, stored client-side, scoped to the
    // signed-in user's id so one account can never see or clear another
    // account's history on a shared browser.
    const recentSearchesKey = `academy_recent_searches_${user?.id ?? "guest"}`;
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    useEffect(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(recentSearchesKey) ?? "[]");
        setRecentSearches(Array.isArray(saved) ? saved.filter((s) => typeof s === "string").slice(0, 10) : []);
      } catch {
        setRecentSearches([]);
      }
    }, [recentSearchesKey]);
    const persistRecentSearches = (list: string[]) => {
      setRecentSearches(list);
      try { localStorage.setItem(recentSearchesKey, JSON.stringify(list)); } catch { /* ignore */ }
    };
    const addRecentSearch = (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) return;
      const next = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      persistRecentSearches(next);
    };
    const removeRecentSearch = (term: string) => {
      persistRecentSearches(recentSearches.filter((s) => s !== term));
    };
    const clearRecentSearches = () => persistRecentSearches([]);

    // Notification state
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifList, setNotifList] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef<HTMLDivElement | null>(null);
    const [avatarUrl, setAvatarUrl] = useState(user?.imageUrl ?? "");

    useEffect(() => {
      setAvatarUrl(user?.imageUrl ?? "");
    }, [user?.imageUrl]);

    useEffect(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<{ imageUrl?: string | null }>).detail;
        if (detail?.imageUrl !== undefined) setAvatarUrl(detail.imageUrl ?? "");
      };
      window.addEventListener("academy:user-updated", handler);
      return () => window.removeEventListener("academy:user-updated", handler);
    }, []);

    useEffect(() => {
      if (!user) return;
      const load = () => {
        apiFetch("/api/notifications", )
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) { setNotifList(d.notifications ?? []); setUnreadCount(d.unreadCount ?? 0); } })
          .catch(() => {});
      };
      load();
      const timer = setInterval(load, 60_000);
      return () => clearInterval(timer);
    }, [user]);

    const getNotificationLink = (n: any): string | null => {
      switch (n.type) {
        case "post_like":
        case "post_comment":
          return "/community";
        case "course_review":
        case "course_completed":
          return n.entityId ? `/courses/${n.entityId}` : null;
        case "repo_like":
        case "repo_rating":
          return "/profile";
        default:
          return null;
      }
    };

    const handleNotificationClick = (n: any) => {
      if (!n.read) {
        apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
        setNotifList((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      }
      const link = getNotificationLink(n);
      if (link) {
        navigate(link);
        setNotifOpen(false);
      }
    };

    const openNotifications = () => {
      setNotifOpen(true);
      if (unreadCount > 0) {
        apiFetch("/api/notifications/read-all",  {method: "POST"}).catch(() => {});
        setUnreadCount(0);
        setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    };

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const openLearn = () => { if (learnTimerRef.current) clearTimeout(learnTimerRef.current); setLearnOpen(true); };
    const closeLearn = () => { learnTimerRef.current = setTimeout(() => setLearnOpen(false), 220); };
    const openCourses = () => { if (coursesTimerRef.current) clearTimeout(coursesTimerRef.current); setCoursesOpen(true); };
    const closeCourses = () => { coursesTimerRef.current = setTimeout(() => setCoursesOpen(false), 220); };

    const isActive = (href: string) => location === href;
    const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? (user as any)?.email ?? "";
    const isAdmin = user?.role === "admin" || userEmail.includes("admin");
    const isEmployer = user?.role === "employer";
    const isCreator = user?.role === "creator";
    // Employers reach the same /admin page (with reduced permissions inside
    // it) as admins — they need the same navbar entry point, not a manual URL.
    const canSeeAdminPanel = isAdmin || isEmployer;
    const initials = (user?.firstName?.charAt(0) ?? "") + (user?.lastName?.charAt(0) ?? "");
    const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "مستخدم";

    // Fetch search results
    useEffect(() => {
      const q = debouncedQuery.trim();
      if (q.length < 2) {
        setSearchResults(null);
        return;
      }
      let cancelled = false;
      setSearchLoading(true);
      apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=all`, )
        .then((r) => (r.ok ? r.json() : null))
        .then((data: SearchResult | null) => {
          if (!cancelled) { setSearchResults(data); setSearchLoading(false); }
        })
        .catch(() => { if (!cancelled) setSearchLoading(false); });
      return () => { cancelled = true; };
    }, [debouncedQuery]);

    // Close search dropdown on outside click
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
          setSearchOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const hasResults = searchResults && (
      (searchResults.courses?.length ?? 0) > 0 ||
      (searchResults.users?.length ?? 0) > 0 ||
      (searchResults.repositories?.length ?? 0) > 0
    );
    const showDropdown = searchOpen && debouncedQuery.trim().length >= 2;

    return (
      <nav
        className="sticky top-0 z-50 w-full shadow-lg"
        style={{ background: "linear-gradient(90deg, #1e1b4b 0%, #3730a3 60%, #4c1d95 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Left: Auth actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Notification Bell */}
              {user && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={openNotifications}
                    className="relative text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    data-testid="button-notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div
                      className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden"
                      style={{ width: "min(20rem, calc(100vw - 1rem))", maxWidth: "20rem" }}
                    >
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                        <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={14} /></button>
                        <span className="font-semibold text-gray-900 text-sm">الإشعارات</span>
                      </div>
                      <div
                        className="overflow-y-auto divide-y divide-gray-50"
                        style={{ maxHeight: "min(20rem, 60vh)" }}
                      >
                        {notifLoading ? (
                          <div className="px-4 py-6 text-center text-gray-400 text-sm">جاري التحميل...</div>
                        ) : notifList.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-400 text-sm">لا توجد إشعارات حتى الآن</div>
                        ) : (
                          notifList.map((n) => {
                            const link = getNotificationLink(n);
                            return (
                              <div
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`px-4 py-3 text-right text-sm transition-colors ${link ? "cursor-pointer" : ""} ${n.read ? "bg-white hover:bg-gray-50" : "bg-indigo-50/60 hover:bg-indigo-50"}`}
                              >
                                <p className="text-gray-800 leading-relaxed break-words whitespace-normal">{n.message}</p>
                                <p className="text-gray-400 text-xs mt-1.5">
                                  {n.createdAt && !Number.isNaN(new Date(n.createdAt).getTime())
                                    ? new Date(n.createdAt).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })
                                    : ""}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-white text-sm font-medium rounded-full px-3 py-1.5 hover:bg-white/10 transition-colors"
                    data-testid="button-user-menu"
                  >
                    <ChevronDown size={12} className="text-white/60" />
                    <span className="hidden sm:block">{displayName}</span>
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs border-2 border-cyan-400/40"
                      style={{ background: "linear-gradient(135deg,#60a5fa,#3730a3)" }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials || user.firstName?.charAt(0) || "م"
                      )}
                    </div>
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute left-0 top-12 bg-white rounded-2xl shadow-xl py-2 w-48 z-50 border border-gray-100">
                        <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                          data-testid="menu-profile">
                          <User size={15} />الملف الشخصي
                        </Link>
                        {isCreator && (
                          <Link href="/creator" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50"
                            data-testid="menu-creator">
                            <PenSquare size={15} />لوحة صانع المحتوى
                          </Link>
                        )}
                        {canSeeAdminPanel && (
                          <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50"
                            data-testid="menu-admin">
                            <ShieldCheck size={15} />لوحة التحكم
                          </Link>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => { setUserMenuOpen(false); signOut(); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          data-testid="menu-signout">
                          <X size={15} />تسجيل الخروج
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/sign-up"
                    className="hidden sm:block rounded-full px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/20"
                    data-testid="link-signup">
                    إنشاء حساب
                  </Link>
                  <Link href="/sign-in" data-testid="link-signin"
                    className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-all"
                    style={{ background: "linear-gradient(90deg,#06b6d4,#14b8a6)" }}>
                    تسجيل الدخول
                  </Link>
                </div>
              )}
            </div>

            {/* Center: Search + Desktop nav */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-center">

              {/* ── Search bar ── */}
              <div ref={searchContainerRef} className="relative" style={{ minWidth: "200px", maxWidth: "280px", width: "100%" }}>
                <div className="flex items-center bg-white/10 hover:bg-white/15 border border-white/20 rounded-full px-3 py-1.5 gap-2 transition-colors">
                  <Search size={14} className="text-white/60 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Enter") addRecentSearch(searchQuery); }}
                    placeholder="ابحث عن كورسات أو منشئين..."
                    className="bg-transparent text-white placeholder-white/50 text-sm outline-none w-full text-right"
                    data-testid="input-search"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} className="text-white/50 hover:text-white/90 shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Recent searches — shown while the box is focused but no query (or too short) is typed yet */}
                {searchOpen && !showDropdown && recentSearches.length > 0 && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 z-[9999] overflow-hidden">
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50">
                      <button onClick={clearRecentSearches} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                        مسح الكل
                      </button>
                      <span className="text-xs font-semibold text-gray-400">عمليات البحث الأخيرة</span>
                    </div>
                    {recentSearches.map((term) => (
                      <div key={term} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 group">
                        <button
                          onClick={() => removeRecentSearch(term)}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          aria-label="حذف"
                        >
                          <X size={13} />
                        </button>
                        <button
                          onClick={() => { setSearchQuery(term); setSearchOpen(true); }}
                          className="flex-1 text-right text-sm text-gray-700 flex items-center gap-2 justify-end"
                        >
                          {term}
                          <Search size={12} className="text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search results dropdown */}
                {showDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 z-[9999] overflow-hidden">
                    {searchLoading && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">جاري البحث...</div>
                    )}
                    {!searchLoading && !hasResults && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج لـ "{debouncedQuery}"</div>
                    )}
                    {!searchLoading && searchResults && (searchResults.courses?.length ?? 0) > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">الكورسات</div>
                        {searchResults.courses.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { addRecentSearch(debouncedQuery); navigate("/courses"); setSearchOpen(false); setSearchQuery(""); }}
                            className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 flex items-center gap-3"
                            data-testid={`search-course-${c.id}`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                              <Code2 size={13} className="text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{c.title}</div>
                              {c.category && <div className="text-xs text-gray-400">{c.category}</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!searchLoading && searchResults && (searchResults.users?.length ?? 0) > 0 && (
                      <div className={searchResults.courses?.length ? "border-t border-gray-50" : ""}>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">منشئو المحتوى</div>
                        {searchResults.users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => { addRecentSearch(debouncedQuery); navigate(`/users/${u.id}`); setSearchOpen(false); setSearchQuery(""); }}
                            className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 flex items-center gap-3"
                            data-testid={`search-user-${u.id}`}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: "linear-gradient(135deg,#60a5fa,#3730a3)" }}
                            >
                              {u.name?.charAt(0) || u.username?.charAt(0) || "م"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{u.name ?? u.username}</div>
                              {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!searchLoading && searchResults && (searchResults.repositories?.length ?? 0) > 0 && (
                      <div className={(searchResults.courses?.length || searchResults.users?.length) ? "border-t border-gray-50" : ""}>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">المستودعات العامة</div>
                        {searchResults.repositories.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => { addRecentSearch(debouncedQuery); if (r.owner?.id) navigate(`/users/${r.owner.id}`); setSearchOpen(false); setSearchQuery(""); }}
                            className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 flex items-center gap-3"
                            data-testid={`search-repo-${r.id}`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                              <FolderGit2 size={13} className="text-cyan-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{r.title}</div>
                              {r.owner?.name && <div className="text-xs text-gray-400">{r.owner.name}</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nav links */}
              <div className="flex items-center gap-4 text-sm font-medium text-white/90">
                <a href="https://platform-fixer-2--staemahmad5070.replit.app" target="_blank" rel="noreferrer"
                  className="hover:text-white transition-colors px-3 py-1.5 rounded-full" data-testid="link-devlink">
                  DevLink
                </a>
                <Link href="/projects" className={`hover:text-white transition-colors ${isActive("/projects") ? "text-white font-semibold" : ""}`} data-testid="link-projects">
                  التكليفات
                </Link>
                <div className="relative" onMouseEnter={openCourses} onMouseLeave={closeCourses}>
                  <button className="flex items-center gap-1 hover:text-white transition-colors py-2" data-testid="nav-courses">
                    الكورسات <ChevronDown size={14} />
                  </button>
                  {coursesOpen && (
                    <div className="absolute top-full right-0 bg-white rounded-2xl shadow-xl py-2 w-52 border border-gray-100" style={{ zIndex: 9999, marginTop: "2px" }}
                      onMouseEnter={openCourses} onMouseLeave={closeCourses}>
                      {COURSES_DROPDOWN.map((item) => (
                        <Link key={item.label} href={item.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 text-right transition-colors"
                          data-testid={`dropdown-course-${item.label}`}>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Link href="/roadmap" className={`hover:text-white transition-colors ${isActive("/roadmap") ? "text-white font-semibold" : ""}`} data-testid="link-roadmap">
                  خارطة الطريق
                </Link>
                <div className="relative" onMouseEnter={openLearn} onMouseLeave={closeLearn}>
                  <button className="flex items-center gap-1 hover:text-white transition-colors py-2" data-testid="nav-learn">
                    تعلم الآن <ChevronDown size={14} />
                  </button>
                  {learnOpen && (
                    <div className="absolute top-full right-0 bg-white rounded-2xl shadow-xl py-2 w-64 border border-gray-100" style={{ zIndex: 9999, marginTop: "2px" }}
                      onMouseEnter={openLearn} onMouseLeave={closeLearn}>
                      {LEARN_DROPDOWN.map((item) => (
                        <Link key={item.label} href={item.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 text-right"
                          data-testid={`dropdown-learn-${item.label}`}>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Link href="/" className={`hover:text-white transition-colors ${isActive("/") ? "text-white font-semibold" : ""}`} data-testid="link-home">
                  الرئيسية
                </Link>
              </div>
            </div>

            {/* Right: Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0" data-testid="link-logo">
              <div className="hidden sm:block text-right">
                <div className="font-bold text-white text-base leading-tight">أكاديمية البرمجة</div>
                <div className="text-cyan-300 text-xs leading-tight">المتكاملة</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/50 flex items-center justify-center border border-indigo-400/40">
                <Code2 size={22} className="text-cyan-300" />
              </div>
            </Link>

            {/* Mobile hamburger */}
            <button className="md:hidden text-white p-2 -mr-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-indigo-900/95 backdrop-blur-sm">
            {/* Mobile search */}
            <div className="px-4 pt-4">
              <div className="flex items-center bg-white/10 border border-white/20 rounded-full px-3 py-2 gap-2">
                <Search size={14} className="text-white/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن كورسات أو منشئين..."
                  className="bg-transparent text-white placeholder-white/50 text-sm outline-none flex-1 text-right"
                  data-testid="mobile-input-search"
                />
              </div>
            </div>
            <div className="px-4 py-4 space-y-1 text-sm font-medium text-white">
              {[
                { label: "الرئيسية", href: "/" },
                { label: "خارطة الطريق", href: "/roadmap" },
                { label: "الكورسات", href: "/courses" },
                { label: "التكليفات والمشاريع", href: "/projects" },
                { label: "أمثلة وتطبيقات", href: "/examples" },
                { label: "التحديات البرمجية", href: "/challenges" },
                { label: "مواقع حل المشاكل", href: "/problemsolving" },
                { label: "مجتمع المبرمجين", href: "/community" },
                { label: "DevLink", href: "/devlink" },
                { label: "لوحة المتصدرين", href: "/leaderboard" },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className={`block py-2.5 px-3 rounded-xl text-right transition-colors ${isActive(item.href) ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                  onClick={() => setMobileOpen(false)} data-testid={`mobile-${item.href}`}>
                  {item.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link href="/profile" className="block py-2.5 px-3 rounded-xl text-right text-cyan-300 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                    الملف الشخصي
                  </Link>
                  {isCreator && (
                    <Link href="/creator" className="block py-2.5 px-3 rounded-xl text-right text-amber-300 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                      لوحة صانع المحتوى
                    </Link>
                  )}
                  {canSeeAdminPanel && (
                    <Link href="/admin" className="block py-2.5 px-3 rounded-xl text-right text-purple-300 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                      لوحة التحكم
                    </Link>
                  )}
                  <button
                    onClick={() => { setMobileOpen(false); signOut(); }}
                    className="w-full text-right py-2.5 px-3 rounded-xl text-red-300 hover:bg-white/10 text-sm font-medium"
                    data-testid="mobile-signout">
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link href="/sign-in" className="flex-1 text-center rounded-full py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(90deg,#06b6d4,#14b8a6)" }} onClick={() => setMobileOpen(false)}>
                    تسجيل الدخول
                  </Link>
                  <Link href="/sign-up" className="flex-1 text-center rounded-full py-2.5 text-sm font-semibold text-white/80 border border-white/30 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                    إنشاء حساب
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    );
  }
  