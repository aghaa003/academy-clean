import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
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

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.message || "حدث خطأ، يرجى المحاولة لاحقاً.");
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
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle size={56} style={{ color: "#16a34a", margin: "0 auto 1rem" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1e1b4b", marginBottom: "0.75rem" }}>
              تم إرسال الرابط!
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: "2rem" }}>
              إذا كان البريد الإلكتروني <strong>{email}</strong> مسجلاً لدينا،
              ستصلك رسالة بها رابط إعادة تعيين كلمة المرور.
              <br />
              تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تجد الرسالة.
            </p>
            <a
              href={basePath + "/sign-in"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#4f46e5",
                fontWeight: 700,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} /> العودة لتسجيل الدخول
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
                <Mail size={24} color="white" />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1e1b4b", margin: "0 0 0.3rem" }}>
                نسيت كلمة المرور؟
              </h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
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
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                >
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  placeholder="البريد الإلكتروني *"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  style={INPUT}
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
                  background: loading
                    ? "linear-gradient(135deg,#818cf8,#a78bfa)"
                    : "linear-gradient(135deg,#4f46e5,#7c3aed)",
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
                {loading && (
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                )}
                {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <a
                href={basePath + "/sign-in"}
                style={{
                  color: "#94a3b8",
                  fontSize: "0.78rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ArrowLeft size={13} /> العودة لتسجيل الدخول
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}