import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/layout/HeroSection";
import { Heart, MessageCircle, Plus, X, Send, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = BASE;

interface Post {
  id: number;
  userId: string;
  title: string;
  body: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  liked: boolean;
}

interface Comment {
  id: number;
  postId: number;
  userId: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

function nameInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() ?? "م";
}

const AVATAR_COLORS = ["#3730a3", "#7c3aed", "#0891b2", "#e11d48", "#16a34a", "#d97706"];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CommunityPage() {
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<number[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, Comment[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<number, boolean>>({});
  const [likeLoading, setLikeLoading] = useState<Record<number, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/community/posts`, { credentials: "include" });
      if (res.ok) setPosts(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const publishPost = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user || publishing) return;
    setPublishing(true);
    try {
      const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/community/posts`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), body: newBody.trim(), tags }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((prev) => [post, ...prev]);
        setShowForm(false);
        setNewTitle(""); setNewBody(""); setNewTags("");
      }
    } finally { setPublishing(false); }
  };

  const toggleLike = async (postId: number) => {
    if (!user || likeLoading[postId]) return;
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${API}/api/community/posts/${postId}/like`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => prev.map((p) =>
          p.id === postId ? { ...p, liked: data.liked, likesCount: data.likesCount } : p
        ));
      }
    } finally { setLikeLoading((prev) => ({ ...prev, [postId]: false })); }
  };

  const toggleComments = async (postId: number) => {
    const isExpanded = expandedComments.includes(postId);
    if (isExpanded) {
      setExpandedComments((prev) => prev.filter((id) => id !== postId));
    } else {
      setExpandedComments((prev) => [...prev, postId]);
      if (!commentsByPost[postId]) {
        setLoadingComments((prev) => ({ ...prev, [postId]: true }));
        try {
          const res = await fetch(`${API}/api/community/posts/${postId}/comments`);
          if (res.ok) {
            const data = await res.json();
            setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
          }
        } finally { setLoadingComments((prev) => ({ ...prev, [postId]: false })); }
      }
    }
  };

  const addComment = async (postId: number) => {
    const text = commentTexts[postId]?.trim();
    if (!text || !user || commentLoading[postId]) return;
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${API}/api/community/posts/${postId}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const comment = await res.json();
        setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      }
    } finally { setCommentLoading((prev) => ({ ...prev, [postId]: false })); }
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <HeroSection
        title="مجتمع المبرمجين"
        subtitle="شارك مشاكلك البرمجية، اطرح أسئلتك، وشارك مشاريعك مع مجتمع المبرمجين العرب"
      />

      <section className="max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: showForm ? "#6b7280" : "linear-gradient(90deg,#3730a3,#7c3aed)" }}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "إلغاء" : "نشر مشكلة أو سؤال"}
          </button>
          <h2 className="text-xl font-bold text-gray-900">آخر المشاركات</h2>
        </div>

        {/* New post form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            {!user ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">يجب عليك تسجيل الدخول أولاً للنشر</p>
                <Link href="/sign-in" className="text-indigo-600 font-semibold hover:underline">تسجيل الدخول</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">عنوان المشكلة أو السؤال</label>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="اكتب عنواناً واضحاً لمشكلتك..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">وصف المشكلة</label>
                  <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={5}
                    placeholder="اشرح مشكلتك بالتفصيل، أضف الكود إن وجد..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">الوسوم (افصل بفاصلة)</label>
                  <input value={newTags} onChange={(e) => setNewTags(e.target.value)}
                    placeholder="مثال: React, JavaScript, CSS"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex justify-end">
                  <button onClick={publishPost} disabled={!newTitle.trim() || !newBody.trim() || publishing}
                    className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                    {publishing ? <><Loader2 size={14} className="animate-spin" />جاري النشر...</> : "نشر المشاركة"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Posts feed */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
            <Loader2 size={22} className="animate-spin" />
            <span>جاري تحميل المشاركات...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <MessageCircle size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">لا توجد مشاركات بعد</p>
            <p className="text-gray-400 text-sm mt-1">كن أول من يبدأ النقاش!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => {
              const commentsExpanded = expandedComments.includes(post.id);
              const postComments = commentsByPost[post.id] ?? [];
              const color = avatarColor(post.authorName);
              return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4 flex-row-reverse">
                      {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm"
                          style={{ backgroundColor: color }}>
                          {nameInitial(post.authorName)}
                        </div>
                      )}
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 text-sm">{post.authorName}</div>
                        <div className="text-xs text-gray-400">{timeAgo(post.createdAt)}</div>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 text-right mb-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed text-right whitespace-pre-line">{post.body}</p>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 justify-end">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-xs border border-indigo-200 text-indigo-600 rounded-full px-2.5 py-1">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4 flex-row-reverse">
                    <button onClick={() => toggleLike(post.id)} disabled={likeLoading[post.id]}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.liked ? "text-red-500" : "text-gray-500 hover:text-red-400"}`}>
                      <Heart size={16} fill={post.liked ? "#ef4444" : "none"} />
                      <span>{post.likesCount}</span>
                    </button>
                    <button onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-500 transition-colors">
                      <MessageCircle size={16} />
                      <span>{post.commentsCount} تعليق</span>
                    </button>
                  </div>

                  {/* Comments section */}
                  {commentsExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      {loadingComments[post.id] ? (
                        <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">جاري التحميل...</span>
                        </div>
                      ) : (
                        <>
                          {postComments.length > 0 && (
                            <div className="p-4 space-y-3">
                              {postComments.map((c) => (
                                <div key={c.id} className="flex gap-3 flex-row-reverse">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                    style={{ backgroundColor: avatarColor(c.authorName) }}>
                                    {nameInitial(c.authorName)}
                                  </div>
                                  <div className="bg-white rounded-xl px-4 py-2.5 text-sm flex-1 text-right border border-gray-100">
                                    <span className="font-semibold text-gray-800 block mb-0.5">{c.authorName}</span>
                                    <span className="text-gray-600 whitespace-pre-line">{c.content}</span>
                                    <span className="text-xs text-gray-400 block mt-1">{timeAgo(c.createdAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {postComments.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-4">لا توجد تعليقات بعد. كن أول من يعلّق!</p>
                          )}

                          {user ? (
                            <div className="px-4 pb-4 flex gap-2 flex-row-reverse">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                style={{ background: "linear-gradient(135deg,#3730a3,#7c3aed)" }}>
                                {nameInitial(user.firstName ?? "م")}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <button onClick={() => addComment(post.id)} disabled={commentLoading[post.id] || !commentTexts[post.id]?.trim()}
                                  className="rounded-full px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                                  style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}>
                                  {commentLoading[post.id] ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                </button>
                                <input value={commentTexts[post.id] ?? ""}
                                  onChange={(e) => setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === "Enter" && addComment(post.id)}
                                  placeholder="اكتب تعليقاً..."
                                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="px-4 pb-4 text-center">
                              <Link href="/sign-in" className="text-indigo-600 text-sm font-medium hover:underline">
                                سجّل الدخول للتعليق
                              </Link>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
