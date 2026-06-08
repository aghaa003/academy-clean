import { useState } from "react";
import { useLocation } from "wouter";
import { useCurrentUser } from "@/lib/auth-context";
import { User, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 2.75rem 0.85rem 1rem",
  borderRadius: "12px",
  border: "1.5px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: "0.9rem",
  textAlign: "right",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "Cairo, sans-serif",
  color: "#1e293b",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

export default function SignInPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const { refreshUser } = useCurrentUser();
  const [, navigate] = useLocation();

 // في SignInPage.tsx داخل دالة handleSubmit

// helper to read a cookie by name
function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  if (!email.trim())  { setError("يرجى إدخال البريد الإلكتروني."); return; }
  if (!password)      { setError("يرجى إدخال كلمة المرور."); return; }
  setLoading(true);

  try {
    // 1. get CSRF cookie
    await apiFetch("/sanctum/csrf-cookie",);

    // 2. read the token from cookie
    const xsrfToken = decodeURIComponent(getCookie("XSRF-TOKEN") ?? "");

    // 3. send it as a header
    const res = await apiFetch("/api/login", {
      method: "POST",
   
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      await refreshUser();
      navigate("/");
    } else {
      const errorData = await res.json();
      setError(errorData.message || "بيانات الدخول غير صحيحة.");
    }
  } catch (err) {
    setError("حدث خطأ في الاتصال بالسيرفر.");
  } finally {
    setLoading(false);
  }
};
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #ff758c 0%, #ff6b9d 20%, #c44dff 50%, #5e17eb 80%, #3b0764 100%)",
        fontFamily: "Cairo, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position:"fixed", top:"8%", left:"6%", width:"220px", height:"220px", borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"10%", right:"8%", width:"180px", height:"180px", borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />

      <div style={{ display:"flex", width:"100%", maxWidth:"860px", borderRadius:"24px", overflow:"hidden", boxShadow:"0 30px 80px rgba(0,0,0,0.35)", minHeight:"500px" }}>

        {/* ── Form ── */}
        <div style={{ flex:"1.1", background:"#ffffff", padding:"2.75rem", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <h1 style={{ fontSize:"1.8rem", fontWeight:900, color:"#1e1b4b", margin:"0 0 0.3rem" }}>تسجيل الدخول</h1>
          <p style={{ color:"#64748b", fontSize:"0.875rem", margin:"0 0 1.75rem" }}>ادخل بياناتك للوصول إلى حسابك</p>

          {error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"0.7rem 1rem", color:"#dc2626", fontSize:"0.82rem", lineHeight:1.55, marginBottom:"1rem" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

            {/* Email */}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}>
                <User size={16} />
              </span>
              <input
                type="email" placeholder="البريد الإلكتروني" value={email} autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                style={INPUT_STYLE}
                onFocus={e => { e.target.style.borderColor="#4f46e5"; e.target.style.boxShadow="0 0 0 3px rgba(79,70,229,0.1)"; }}
                onBlur={e => { e.target.style.borderColor="#e2e8f0"; e.target.style.boxShadow="none"; }}
              />
            </div>

            {/* Password */}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}>
                <Lock size={16} />
              </span>
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"4px", display:"flex" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <input
                type={showPw ? "text" : "password"} placeholder="كلمة المرور" value={password} autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
                style={{ ...INPUT_STYLE, paddingLeft:"2.75rem" }}
                onFocus={e => { e.target.style.borderColor="#4f46e5"; e.target.style.boxShadow="0 0 0 3px rgba(79,70,229,0.1)"; }}
                onBlur={e => { e.target.style.borderColor="#e2e8f0"; e.target.style.boxShadow="none"; }}
              />
            </div>

            {/* Remember + Forgot */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        
          <a
            href={basePath + "/forgot-password"}
  style={{ color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
>
  نسيت كلمة المرور؟
</a>
              <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"0.8rem", color:"#64748b", cursor:"pointer" }}>
                <input type="checkbox" style={{ accentColor:"#4f46e5", width:"14px", height:"14px" }} />
                تذكرني
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:"100%", padding:"0.875rem", borderRadius:"12px",
                background: loading ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                color:"white", fontWeight:800, fontSize:"0.95rem",
                border:"none", cursor:loading ? "not-allowed" : "pointer",
                transition:"all 0.2s", fontFamily:"Cairo, sans-serif",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
              }}
            >
              {loading && <span style={{ width:"16px", height:"16px", border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"white", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />}
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", margin:"0.25rem 0" }}>
              <div style={{ flex:1, height:"1px", background:"#e2e8f0" }} />
              <span style={{ color:"#94a3b8", fontSize:"0.78rem", whiteSpace:"nowrap" }}>أو سجل الدخول باستخدام</span>
              <div style={{ flex:1, height:"1px", background:"#e2e8f0" }} />
            </div>

            {/* Social buttons (UI only) */}
            <div style={{ display:"flex", justifyContent:"center", gap:"0.75rem" }}>
              {[
                { label:"Google",   color:"#ea4335", svg:<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
                { label:"GitHub",   color:"#24292e", svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg> },
                { label:"LinkedIn", color:"#0077b5", svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg> },
              ].map(({ label, color, svg }) => (
                <button
                  key={label} type="button" title={label}
                  style={{ width:"50px", height:"50px", borderRadius:"12px", border:"1.5px solid #e2e8f0", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color, transition:"all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background="#f1f5f9"; (e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background="#f8fafc"; (e.currentTarget as HTMLButtonElement).style.transform="translateY(0)"; }}
                >
                  {svg}
                </button>
              ))}
            </div>
          </form>

          <div style={{ textAlign:"center", marginTop:"1.5rem", fontSize:"0.875rem", color:"#64748b" }}>
            ليس لديك حساب؟{" "}
            <a href={basePath + "/sign-up"} style={{ color:"#4f46e5", fontWeight:700, textDecoration:"none" }}>أنشئ حساباً الآن</a>
          </div>
          <div style={{ textAlign:"center", marginTop:"0.75rem" }}>
            <a href={basePath + "/"} style={{ color:"#94a3b8", fontSize:"0.78rem", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"4px" }}>
              <ArrowLeft size={13} /> العودة إلى الرئيسية
            </a>
          </div>
        </div>

        {/* ── Info panel ── */}
        <div
          className="hidden md:flex"
          style={{ flex:"0.9", background:"linear-gradient(155deg,#4f46e5 0%,#7c3aed 60%,#6d28d9 100%)", padding:"2.75rem", flexDirection:"column", justifyContent:"center", color:"white", textAlign:"right", position:"relative", overflow:"hidden" }}
        >
          <div style={{ position:"absolute", top:"-50px", left:"-50px", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
          <div style={{ position:"absolute", bottom:"-40px", right:"-40px", width:"160px", height:"160px", borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
          <div style={{ position:"relative", zIndex:1 }}>
            <h2 style={{ fontSize:"2rem", fontWeight:900, margin:"0 0 0.75rem", lineHeight:1.2 }}>مرحباً بعودتك!</h2>
            <p style={{ color:"rgba(255,255,255,0.8)", fontSize:"0.875rem", margin:"0 0 2.25rem", lineHeight:1.75 }}>
              سجل الدخول إلى حسابك لتستكشف عالم البرمجة<br/>وتواصل رحلتك التعليمية معنا.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              {["وصول كامل إلى جميع الكورسات","متابعة تقدمك التعليمي","دعم مباشر من المبرمجين","شهادات معتمدة بعد الإنجاز"].map(item => (
                <div key={item} style={{ display:"flex", alignItems:"center", gap:"10px", flexDirection:"row-reverse" }}>
                  <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"1.5px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", flexShrink:0, color:"#67e8f9" }}>✓</div>
                  <span style={{ fontSize:"0.875rem", color:"rgba(255,255,255,0.92)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
