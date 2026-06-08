import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

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

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [showCPw,   setShowCPw]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");

  // Read token and email from URL
  const params = new URLSearchParams(window.location.search);
  const token  = params.get("token") ?? "";
  const email  = params.get("email") ?? "";
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "0.75rem 1.5rem",
  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
  color: "white",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "0.875rem",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "Cairo, sans-serif",
});
  useEffect(() => {
    if (!token || !email) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }
    apiFetch(`/api/password/verify-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => setTokenValid(data.valid === true))
      .catch(() => setTokenValid(false))
      .finally(() => setVerifying(false));
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل."); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }

    setLoading(true);
    try {
      const res = await apiFetch("/api/password/reset", {
        method: "POST",
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: confirm,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(data.message || "حدث خطأ، يرجى المحاولة مجدداً.");
      }
    } catch {
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
        background: "linear-gradient(135deg,#a855f7 0%,#7c3aed 30%,#6d28d9 60%,#4c1d95 100%)",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
        }}
      >
        {verifying ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            <p style={{ color: "#64748b", marginTop: "1rem", fontSize: "0.875rem" }}>جاري التحقق...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !tokenValid ? (
          <div style={{ textAlign: "center" }}>
            <XCircle size={56} style={{ color: "#dc2626", margin: "0 auto 1rem" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1e1b4b", marginBottom: "0.75rem" }}>
              الرابط غير صالح
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: "2rem" }}>
              رابط إعادة التعيين غير صالح أو منتهي الصلاحية.
              يرجى طلب رابط جديد.
            </p>
            
<a href={basePath + "/forgot-password"} style={btnStyle(false)}>
  طلب رابط جديد
</a>
          </div>
        ) : done ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle size={56} style={{ color: "#16a34a", margin: "0 auto 1rem" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1e1b4b", marginBottom: "0.75rem" }}>
              تم تغيير كلمة المرور!
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: "2rem" }}>
              تم إعادة تعيين كلمة المرور بنجاح.
              يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
            </p>
            
         <a href={basePath + "/sign-in"} style={btnStyle(false)}>
  تسجيل الدخول
</a>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <Lock size={24} color="white" />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1e1b4b", margin: "0 0 0.3rem" }}>
                إعادة تعيين كلمة المرور
              </h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
                أدخل كلمة المرور الجديدة
              </p>
            </div>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  color: "#dc2626",
                  fontSize: "0.83rem",
                  marginBottom: "1rem",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
                  <Lock size={15} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px", display: "flex" }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="كلمة المرور الجديدة *"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...INPUT, paddingLeft: "2.75rem" }}
                  onFocus={(e) => { e.target.style.borderColor = "#4f46e5"; e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
                  <Lock size={15} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowCPw((p) => !p)}
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px", display: "flex" }}
                >
                  {showCPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <input
                  type={showCPw ? "text" : "password"}
                  placeholder="تأكيد كلمة المرور الجديدة *"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{ ...INPUT, paddingLeft: "2.75rem" }}
                  onFocus={(e) => { e.target.style.borderColor = "#4f46e5"; e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  borderRadius: "12px",
                  background: loading ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "1rem",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "Cairo, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {loading && <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                {loading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}