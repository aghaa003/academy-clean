import { useState } from "react";
import { useLocation } from "wouter";
import { useCurrentUser } from "@/lib/auth-context";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const INPUT: React.CSSProperties = {
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

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

export default function SignUpPage() {
  const [firstName,  setFirstName]  = useState("");
  const [lastName,   setLastName]   = useState("");
  const [username,   setUsername]   = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [showCPw,    setShowCPw]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const { refreshUser } = useCurrentUser();
  const [, navigate] = useLocation();

  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#4f46e5";
    e.target.style.boxShadow   = "0 0 0 3px rgba(79,70,229,0.1)";
  };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e2e8f0";
    e.target.style.boxShadow   = "none";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim())                     { setError("يرجى إدخال الاسم الأول."); return; }
    if (!username.trim() || username.length < 3) { setError("يرجى إدخال اسم مستخدم (3 أحرف على الأقل)."); return; }
    if (!email.trim() || !email.includes("@")) { setError("يرجى إدخال بريد إلكتروني صحيح."); return; }
    if (!password)                             { setError("يرجى إدخال كلمة المرور."); return; }
    if (password.length < 8)                   { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل."); return; }
    if (password !== confirmPw)                { setError("كلمتا المرور غير متطابقتين."); return; }

    setLoading(true);

    try {
      // 1. get CSRF cookie
      await fetch("/sanctum/csrf-cookie", { credentials: "include" });

      // 2. read the token from cookie
      const xsrfToken = decodeURIComponent(getCookie("XSRF-TOKEN") ?? "");

      // 3. send registration request with XSRF token header
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          username,
          email,
          password,
        }),
        credentials: "include",
      });

      if (res.ok) {
        await refreshUser();
        navigate("/");
      } else {
        const data = await res.json();
        setError(data.message || "فشل التسجيل");
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
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
        background: "linear-gradient(135deg,#a855f7 0%,#7c3aed 30%,#6d28d9 60%,#4c1d95 100%)",
        fontFamily: "Cairo, sans-serif", position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position:"fixed", top:"5%", right:"5%", width:"250px", height:"250px", borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"8%", left:"6%", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />

      <div style={{ display:"flex", width:"100%", maxWidth:"880px", borderRadius:"24px", overflow:"hidden", boxShadow:"0 30px 80px rgba(0,0,0,0.35)" }}>

        {/* ── Form ── */}
        <div style={{ flex:"1.1", background:"#fff", padding:"2.75rem", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <h1 style={{ fontSize:"1.75rem", fontWeight:900, color:"#1e1b4b", margin:"0 0 0.3rem" }}>إنشاء حساب جديد</h1>
          <p style={{ color:"#64748b", fontSize:"0.875rem", margin:"0 0 1.5rem" }}>أملأ بياناتك لإنشاء حسابك فوراً</p>

          {error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"0.75rem 1rem", color:"#dc2626", fontSize:"0.83rem", lineHeight:1.6, marginBottom:"1.1rem" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

            {/* Name row */}
            <div style={{ display:"flex", gap:"0.75rem" }}>
              {[
                { ph:"الاسم الأول *", val:firstName, set:setFirstName, ac:"given-name" },
                { ph:"اسم العائلة",   val:lastName,  set:setLastName,  ac:"family-name" },
              ].map(({ ph, val, set, ac }) => (
                <div key={ph} style={{ position:"relative", flex:1 }}>
                  <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}><User size={15}/></span>
                  <input
                    type="text" placeholder={ph} value={val} autoComplete={ac}
                    onChange={e => set(e.target.value)}
                    style={INPUT} onFocus={focus} onBlur={blur}
                  />
                </div>
              ))}
            </div>

            {/* Username */}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}><User size={15}/></span>
              <input
                type="text" placeholder="اسم المستخدم *" value={username} autoComplete="username"
                onChange={e => setUsername(e.target.value)}
                style={INPUT} onFocus={focus} onBlur={blur}
              />
            </div>

            {/* Email */}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}><Mail size={15}/></span>
              <input
                type="email" placeholder="البريد الإلكتروني *" value={email} autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                style={INPUT} onFocus={focus} onBlur={blur}
              />
            </div>

            {/* Password */}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}><Lock size={15}/></span>
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"4px", display:"flex" }}>
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
              <input
                type={showPw ? "text" : "password"} placeholder="كلمة المرور *" value={password} autoComplete="new-password"
                onChange={e => setPassword(e.target.value)}
                style={{ ...INPUT, paddingLeft:"2.75rem" }} onFocus={focus} onBlur={blur}
              />
            </div>

            {/* Confirm password */}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }}><Lock size={15}/></span>
              <button type="button" onClick={() => setShowCPw(p => !p)} style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"4px", display:"flex" }}>
                {showCPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
              <input
                type={showCPw ? "text" : "password"} placeholder="تأكيد كلمة المرور *" value={confirmPw} autoComplete="new-password"
                onChange={e => setConfirmPw(e.target.value)}
                style={{ ...INPUT, paddingLeft:"2.75rem" }} onFocus={focus} onBlur={blur}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:"100%", padding:"0.95rem", borderRadius:"12px",
                background: loading ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                color:"white", fontWeight:800, fontSize:"1rem",
                border:"none", cursor:loading ? "not-allowed" : "pointer",
                fontFamily:"Cairo, sans-serif", transition:"all 0.2s", marginTop:"0.25rem",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
              }}
            >
              {loading && <span style={{ width:"16px", height:"16px", border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"white", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />}
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب ✓"}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
          </form>

          <div style={{ textAlign:"center", marginTop:"1.5rem", fontSize:"0.875rem", color:"#64748b" }}>
            لديك حساب بالفعل؟{" "}
            <a href={basePath + "/sign-in"} style={{ color:"#4f46e5", fontWeight:700, textDecoration:"none" }}>سجل الدخول الآن</a>
          </div>
          <div style={{ textAlign:"center", marginTop:"0.5rem" }}>
            <a href={basePath + "/"} style={{ color:"#94a3b8", fontSize:"0.78rem", textDecoration:"none" }}>← العودة إلى الرئيسية</a>
          </div>
        </div>

        {/* ── Info panel ── */}
        <div
          className="hidden md:flex"
          style={{ flex:"0.9", background:"linear-gradient(155deg,#4f46e5 0%,#7c3aed 60%,#6d28d9 100%)", padding:"2.75rem", flexDirection:"column", justifyContent:"center", color:"white", textAlign:"right", position:"relative", overflow:"hidden" }}
        >
          <div style={{ position:"absolute", top:"-50px", left:"-50px", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(255,255,255,0.07)" }}/>
          <div style={{ position:"absolute", bottom:"-40px", right:"-40px", width:"160px", height:"160px", borderRadius:"50%", background:"rgba(255,255,255,0.07)" }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <h2 style={{ fontSize:"1.85rem", fontWeight:900, margin:"0 0 0.75rem", lineHeight:1.2 }}>انضم إلى مجتمعنا!</h2>
            <p style={{ color:"rgba(255,255,255,0.8)", fontSize:"0.875rem", margin:"0 0 2rem", lineHeight:1.8 }}>
              أنشئ حسابك اليوم وابدأ رحلتك في عالم البرمجة مع أفضل المنصات التعليمية العربية.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.9rem" }}>
              {["وصول كامل إلى جميع الكورسات","متابعة تقدمك التعليمي","دعم مباشر من المبرمجين","شهادات معتمدة بعد الإنجاز","مشاريع عملية حقيقية","مجتمع تفاعلي للمبرمجين"].map(item => (
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