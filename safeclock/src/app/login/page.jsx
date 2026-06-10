"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const C = {
  bg: "#0f1117", panel: "#161b27", border: "#1e2535",
  accent: "#00d4a8", accentDim: "#00d4a820", accentBorder: "#00d4a840",
  text: "#e8eaf0", muted: "#6b7591", faint: "#2a3148", red: "#ff5f6d",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true); setError("");
    const result = await signIn("credentials", { redirect: false, email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (result?.error) { setError("Email ou mot de passe incorrect."); }
    else { router.replace("/dashboard"); }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: "36px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⏱</div>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 18, letterSpacing: "-0.4px" }}>SafeClock</span>
        </div>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Connexion</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Entrez vos identifiants pour accéder à votre espace.</p>

        {[{ label: "Email", val: email, set: setEmail, type: "email", placeholder: "alice@example.com" },
          { label: "Mot de passe", val: password, set: setPassword, type: "password", placeholder: "••••••••" }
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder={f.placeholder}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 9, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          </div>
        ))}

        {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: C.red + "18", border: `1px solid ${C.red}40`, color: C.red, fontSize: 13 }}>{error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: 12, borderRadius: 9, background: loading ? C.faint : C.accent, border: "none", color: loading ? C.muted : "#000", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "Connexion en cours…" : "Se connecter"}
        </button>

        <div style={{ marginTop: 24, padding: "12px 14px", borderRadius: 8, background: C.accentDim, border: `1px solid ${C.accentBorder}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Comptes de démo</div>
          {[{ label: "Owner", email: "alice@safeclock.app" }, { label: "Employé", email: "bob@safeclock.app" }].map(acc => (
            <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword("demo1234"); }}
              style={{ display: "block", background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", textAlign: "left", padding: "2px 0", fontFamily: "inherit" }}>
              <span style={{ color: C.accent, marginRight: 6 }}>{acc.label}:</span>{acc.email}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}