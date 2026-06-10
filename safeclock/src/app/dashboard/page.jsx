// safeclock-frontend.jsx
// À placer dans : safeclock/src/app/dashboard/page.jsx  (ou page.tsx)
// Toutes les données statiques remplacées par des appels API réels

"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Palette ──────────────────────────────────────────────────────
const C = {
  bg: "#0f1117", panel: "#161b27", border: "#1e2535",
  accent: "#00d4a8", accentDim: "#00d4a820", accentBorder: "#00d4a840",
  text: "#e8eaf0", muted: "#6b7591", faint: "#2a3148",
  red: "#ff5f6d", amber: "#ffa500", blue: "#4a9eff",
  purple: "#a78bfa", green: "#00d4a8",
};

// ── Helpers ───────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
function fmtDuration(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
function fmtHours(h) {
  const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
function colorForName(name = "") {
  const colors = ["#00d4a8", "#4a9eff", "#ffa500", "#a78bfa", "#ff5f6d"];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── API fetch helper ──────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Loading skeleton ──────────────────────────────────────────────
function Skeleton({ width = "100%", height = 18, radius = 6 }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: `linear-gradient(90deg, ${C.faint} 25%, ${C.border} 50%, ${C.faint} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.2s infinite",
    }} />
  );
}

// ── AI Chat Panel ─────────────────────────────────────────────────
function AIPanel({ context, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Bonjour ! Je suis votre assistant SafeClock. Je peux analyser vos données, générer des rapports ou répondre à vos questions sur la gestion du temps." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Tu es l'assistant IA intégré à SafeClock, une application de suivi du temps pour PME belges.\n\nContexte actuel :\n${JSON.stringify(context, null, 2)}\n\nRéponds en français, de façon concise et utile.`,
          messages: messages.slice(1).concat({ role: "user", content: userMsg }).map(m => ({
            role: m.role, content: m.text || m.content
          }))
        })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data.content?.[0]?.text || "Désolé, une erreur est survenue." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Erreur de connexion à l'IA." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, background: C.panel, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", zIndex: 100 }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentDim, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
          <div>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Assistant IA</div>
            <div style={{ color: C.accent, fontSize: 11 }}>● En ligne</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? C.accent : C.faint, color: m.role === "user" ? "#000" : C.text, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex" }}><div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: C.faint, color: C.muted, fontSize: 13 }}>Analyse en cours…</div></div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {["Rentabilité ce mois", "Dépassements budget", "Résumé semaine"].map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, background: C.faint, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Posez votre question…" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: C.faint, border: `1px solid ${C.border}`, color: C.text, outline: "none", fontFamily: "inherit" }} />
          <button onClick={send} disabled={loading} style={{ padding: "10px 16px", borderRadius: 10, background: C.accent, border: "none", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ page, setPage, session }) {
  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(session?.user?.role);
  const items = [
    { id: "timer",     icon: "⏱", label: "Chronomètre" },
    { id: "timesheet", icon: "📋", label: "Feuilles de temps" },
    { id: "projects",  icon: "📁", label: "Projets" },
    ...(isManager ? [
      { id: "reports",  icon: "📊", label: "Rapports" },
      { id: "team",     icon: "👥", label: "Équipe" },
      { id: "approval", icon: "✅", label: "Approbation" },
    ] : []),
    { id: "leaves",   icon: "🏖", label: "Congés" },
  ];
  const user = session?.user;
  const userColor = colorForName(user?.name);

  return (
    <div style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "20px 18px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⏱</div>
        <span style={{ color: C.text, fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>SafeClock</span>
      </div>
      <div style={{ padding: "0 8px", flex: 1 }}>
        {items.map(item => (
          <div key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: page === item.id ? C.accentDim : "transparent", borderLeft: page === item.id ? `2px solid ${C.accent}` : "2px solid transparent", color: page === item.id ? C.accent : C.muted, fontSize: 13, fontWeight: page === item.id ? 600 : 400, transition: "all 0.15s" }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: userColor + "30", border: `1px solid ${userColor}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: userColor }}>{initials(user?.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
            <div style={{ color: C.muted, fontSize: 11 }}>{user?.role}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} title="Déconnexion" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 2 }}>⎋</button>
        </div>
      </div>
    </div>
  );
}

// ── Timer Page ────────────────────────────────────────────────────
function TimerPage({ projects }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [desc, setDesc] = useState("");
  const [projId, setProjId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const ivRef = useRef(null);

  useEffect(() => {
    apiFetch(`/api/time-entries?date=${todayKey()}`)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoadingEntries(false));
  }, []);

  function toggle() {
    if (!running) {
      setRunning(true);
      ivRef.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      clearInterval(ivRef.current);
      setRunning(false);
      if (secs > 0) {
        const hours = Math.round(secs / 36) / 100;
        apiFetch("/api/time-entries", {
          method: "POST",
          body: JSON.stringify({ projectId: projId || null, description: desc || "Tâche sans titre", hours, date: todayKey(), source: "timer" }),
        }).then(entry => setEntries(e => [entry, ...e])).catch(console.error);
      }
      setSecs(0); setDesc(""); setProjId("");
    }
  }

  const todayHours = entries.reduce((a, e) => a + e.hours, 0);

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Chronomètre</h1>
        <span style={{ color: C.muted, fontSize: 13 }}>{new Date().toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      <div style={{ background: C.panel, border: `1px solid ${running ? C.accentBorder : C.border}`, borderRadius: 14, padding: 20, marginBottom: 24, transition: "border-color 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Sur quoi travaillez-vous ?" style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          <select value={projId} onChange={e => setProjId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: projId ? C.text : C.muted, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="">— Projet —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ fontSize: 32, fontWeight: 700, color: running ? C.accent : C.text, minWidth: 110, textAlign: "right", fontVariantNumeric: "tabular-nums", letterSpacing: "-1px" }}>{fmtDuration(secs)}</div>
          <button onClick={toggle} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", background: running ? C.red : C.accent, color: "#000", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: running ? `0 0 20px ${C.red}60` : `0 0 20px ${C.accent}60` }}>{running ? "⏹" : "▶"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total aujourd'hui", val: fmtHours(todayHours), sub: `${entries.length} entrées` },
          { label: "Projets actifs", val: projects.filter(p => p.status === "ACTIVE").length, sub: "ce mois" },
          { label: "En cours", val: running ? fmtDuration(secs) : "—", sub: running ? "timer actif" : "aucun timer" },
        ].map(s => (
          <div key={s.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: C.text, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Entrées du jour</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loadingEntries && [1, 2].map(i => <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}><Skeleton /></div>)}
        {!loadingEntries && entries.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Aucune entrée aujourd'hui — lancez le timer !</div>}
        {entries.map(e => {
          const color = e.project?.color || C.muted;
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{e.description || "Sans description"}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{e.project?.name || "Sans projet"}{e.project?.client ? ` · ${e.project.client}` : ""}</div>
              </div>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtHours(e.hours)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Timesheet Page ────────────────────────────────────────────────
function TimesheetPage() {
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/timesheets?month=${month}`)
      .then(setSheet)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  async function submit() {
    if (!sheet || acting) return;
    setActing(true);
    try {
      const res = await apiFetch(`/api/timesheets/${sheet.id}/action`, { method: "POST", body: JSON.stringify({ action: "submit" }) });
      setSheet(s => ({ ...s, status: res.status, totalHours: res.totalHours }));
    } catch (e) { alert(e.message); }
    setActing(false);
  }

  const statusStyle = {
    DRAFT:     { label: "Brouillon",  color: C.muted  },
    SUBMITTED: { label: "Soumis",     color: C.amber  },
    APPROVED:  { label: "Approuvé",   color: C.accent },
    REJECTED:  { label: "Refusé",     color: C.red    },
  };

  // Grouper les entrées par date
  const byDate = {};
  (sheet?.entries || []).forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Feuille de temps</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          {sheet?.status === "DRAFT" || sheet?.status === "REJECTED" ? (
            <button onClick={submit} disabled={acting} style={{ padding: "7px 14px", borderRadius: 8, background: C.accent, border: "none", color: "#000", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {acting ? "Envoi…" : "Soumettre"}
            </button>
          ) : null}
        </div>
      </div>

      {loading && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3].map(i => <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}><Skeleton /></div>)}</div>}

      {!loading && sheet && (
        <>
          {/* Statut + total */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Statut", val: statusStyle[sheet.status]?.label, color: statusStyle[sheet.status]?.color },
              { label: "Total heures", val: fmtHours(sheet.totalHours || 0), color: C.text },
              { label: "Entrées", val: sheet.entries?.length || 0, color: C.text },
            ].map(s => (
              <div key={s.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{s.label}</div>
                <div style={{ color: s.color || C.text, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Entrées groupées par jour */}
          {Object.keys(byDate).sort().reverse().map(date => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {new Date(date + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              {byDate[date].map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 6 }}>
                  <div style={{ width: 3, height: 28, borderRadius: 2, background: e.project?.color || C.muted, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{e.description || "Sans description"}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{e.project?.name || "Sans projet"}</div>
                  </div>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{fmtHours(e.hours)}</div>
                </div>
              ))}
            </div>
          ))}

          {sheet.entries?.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
              Aucune entrée pour ce mois. Utilisez le chronomètre pour enregistrer du temps.
            </div>
          )}

          {sheet.status === "REJECTED" && sheet.rejectedReason && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: C.red + "15", border: `1px solid ${C.red}40`, color: C.red, fontSize: 13 }}>
              ⚠ Refusé : {sheet.rejectedReason}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Projects Page ─────────────────────────────────────────────────
function ProjectsPage({ projects, loading, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", billRate: "", budgetHours: "", color: "#00d4a8" });
  const [saving, setSaving] = useState(false);

  async function createProject() {
    if (!form.name) return;
    setSaving(true);
    try {
      await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: form.name, client: form.client || undefined, billRate: form.billRate ? +form.billRate : undefined, budgetHours: form.budgetHours ? +form.budgetHours : undefined, color: form.color }),
      });
      setShowForm(false);
      setForm({ name: "", client: "", billRate: "", budgetHours: "", color: "#00d4a8" });
      onRefresh();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Projets & Clients</h1>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: "8px 16px", borderRadius: 8, background: C.accent, border: "none", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Nouveau projet</button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div style={{ background: C.panel, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { key: "name", label: "Nom du projet *", placeholder: "Ex: Refonte Site Web" },
              { key: "client", label: "Client", placeholder: "Ex: Acme Corp" },
              { key: "billRate", label: "Taux horaire (€/h)", placeholder: "120", type: "number" },
              { key: "budgetHours", label: "Budget heures", placeholder: "180", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ color: C.muted, fontSize: 12 }}>Couleur :</label>
            <input type="color" value={form.color} onChange={e => setForm(v => ({ ...v, color: e.target.value }))} style={{ width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer", background: "none" }} />
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 14px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 13 }}>Annuler</button>
            <button onClick={createProject} disabled={saving || !form.name} style={{ padding: "8px 16px", borderRadius: 8, background: form.name ? C.accent : C.faint, border: "none", color: form.name ? "#000" : C.muted, fontWeight: 600, fontSize: 13, cursor: form.name ? "pointer" : "not-allowed" }}>{saving ? "Création…" : "Créer"}</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {loading && [1, 2, 3].map(i => <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}><Skeleton height={80} /></div>)}
        {!loading && projects.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Aucun projet — créez-en un !</div>}
        {projects.map(p => {
          const pct = p.budgetHours ? Math.round(p.usedHours / p.budgetHours * 100) : null;
          const over = pct !== null && pct > 85;
          const color = p.color || "#00d4a8";
          return (
            <div key={p.id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p.client || "Sans client"}{p.billRate ? ` · ${p.billRate}€/h` : ""}</div>
                  </div>
                </div>
                {pct !== null && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: over ? C.red : C.accent, fontSize: 18, fontWeight: 700 }}>{pct}%</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>consommé</div>
                  </div>
                )}
              </div>
              {p.budgetHours && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 8 }}>
                    <span>{p.usedHours.toFixed(1)}h / {p.budgetHours}h budgétées</span>
                    {p.billRate && <span>{(p.usedHours * p.billRate).toLocaleString("fr")}€ / {(p.budgetHours * p.billRate).toLocaleString("fr")}€</span>}
                  </div>
                  <div style={{ height: 6, background: C.faint, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: over ? C.red : color, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  {over && <div style={{ marginTop: 8, fontSize: 11, color: C.red }}>⚠ Budget dépassé à plus de 85%</div>}
                </>
              )}
              {!p.budgetHours && <div style={{ color: C.muted, fontSize: 12 }}>{p.usedHours.toFixed(1)}h enregistrées · Pas de budget défini</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────
function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonthKey());

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/reports?month=${month}`)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  const maxH = report ? Math.max(...report.byProject.map(p => p.hours), 1) : 1;
  const maxM = report ? Math.max(...report.byMember.map(m => m.hours), 1) : 1;

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Rapports & Analyses</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
      </div>

      {loading && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>{[1,2,3,4].map(i => <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}><Skeleton height={60} /></div>)}</div>}

      {!loading && report && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Heures ce mois", val: fmtHours(report.totalHours) },
              { label: "Revenus générés", val: `${report.totalRevenue.toLocaleString("fr")}€` },
              { label: "Projets actifs", val: report.byProject.length },
              { label: "Membres actifs", val: report.byMember.length },
            ].map(s => (
              <div key={s.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{s.label}</div>
                <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Temps par projet</div>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            {report.byProject.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Aucune donnée ce mois</div>}
            {report.byProject.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.muted, width: 160, flexShrink: 0, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ flex: 1, height: 8, background: C.faint, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.hours / maxH * 100}%`, background: p.color || C.accent, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600, minWidth: 48, textAlign: "right" }}>{p.hours.toFixed(1)}h</div>
              </div>
            ))}
          </div>

          <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Temps par membre</div>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            {report.byMember.map(m => {
              const color = colorForName(m.name);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: 160, flexShrink: 0, justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color, flexShrink: 0 }}>{initials(m.name)}</div>
                  </div>
                  <div style={{ flex: 1, height: 8, background: C.faint, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${m.hours / maxM * 100}%`, background: color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600, minWidth: 48, textAlign: "right" }}>{m.hours.toFixed(1)}h</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Team Page ─────────────────────────────────────────────────────
function TeamPage({ members, loading, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE", jobTitle: "", hourlyRate: "" });
  const [saving, setSaving] = useState(false);

  async function invite() {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      await apiFetch("/api/members", { method: "POST", body: JSON.stringify({ ...form, hourlyRate: form.hourlyRate ? +form.hourlyRate : undefined }) });
      setShowForm(false);
      setForm({ name: "", email: "", role: "EMPLOYEE", jobTitle: "", hourlyRate: "" });
      onRefresh();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Gestion d'équipe</h1>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: "8px 16px", borderRadius: 8, background: C.accent, border: "none", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Inviter</button>
      </div>

      {showForm && (
        <div style={{ background: C.panel, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { key: "name", label: "Nom *", placeholder: "Alice Martin" },
              { key: "email", label: "Email *", placeholder: "alice@company.com", type: "email" },
              { key: "jobTitle", label: "Fonction", placeholder: "Développeur" },
              { key: "hourlyRate", label: "Taux horaire (€/h)", placeholder: "80", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ color: C.muted, fontSize: 12 }}>Rôle :</label>
            <select value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }}>
              <option value="EMPLOYEE">Employé</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 14px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 13 }}>Annuler</button>
            <button onClick={invite} disabled={saving || !form.name || !form.email} style={{ padding: "8px 16px", borderRadius: 8, background: (form.name && form.email) ? C.accent : C.faint, border: "none", color: (form.name && form.email) ? "#000" : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{saving ? "Envoi…" : "Inviter"}</button>
          </div>
        </div>
      )}

      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 110px", background: C.faint }}>
          {["Membre", "Rôle", "Taux/h", "Statut"].map(h => (
            <div key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>
        {loading && [1,2,3].map(i => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 110px", borderTop: `1px solid ${C.border}`, padding: 14 }}>
            <Skeleton width={160} />
          </div>
        ))}
        {!loading && members.map(m => {
          const color = colorForName(m.name);
          return (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 110px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: color + "25", border: `1px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{initials(m.name)}</div>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{m.email}</div>
                </div>
              </div>
              <div style={{ padding: "14px", color: C.muted, fontSize: 13, display: "flex", alignItems: "center" }}>{m.role}</div>
              <div style={{ padding: "14px", color: C.text, fontSize: 13, display: "flex", alignItems: "center" }}>{m.hourlyRate ? `${m.hourlyRate}€/h` : "—"}</div>
              <div style={{ padding: "14px", display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, background: C.accentDim, padding: "3px 8px", borderRadius: 20 }}>● Actif</span>
              </div>
            </div>
          );
        })}
        {!loading && members.length === 0 && <div style={{ padding: "32px 0", color: C.muted, fontSize: 13, textAlign: "center" }}>Aucun membre</div>}
      </div>
    </div>
  );
}

// ── Approval Page ─────────────────────────────────────────────────
function ApprovalPage() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [month, setMonth] = useState(currentMonthKey());

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/timesheets?month=${month}&all=true`)
      .then(setSheets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  async function act(id, action, reason) {
    setActing(id);
    try {
      const res = await apiFetch(`/api/timesheets/${id}/action`, { method: "POST", body: JSON.stringify({ action, reason }) });
      setSheets(s => s.map(sh => sh.id === id ? { ...sh, status: res.status } : sh));
    } catch (e) { alert(e.message); }
    setActing(null);
  }

  const statusStyle = {
    DRAFT:     { label: "Brouillon",  color: C.muted  },
    SUBMITTED: { label: "Soumis",     color: C.amber  },
    APPROVED:  { label: "Approuvé",   color: C.accent },
    REJECTED:  { label: "Refusé",     color: C.red    },
  };
  const pending = sheets.filter(s => s.status === "SUBMITTED").length;

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Approbation des feuilles de temps</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: C.muted, fontSize: 13 }}>{pending} en attente</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && [1,2,3].map(i => <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}><Skeleton /></div>)}
        {!loading && sheets.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Aucune feuille ce mois</div>}
        {sheets.map(sheet => {
          const s = statusStyle[sheet.status];
          const color = colorForName(sheet.user?.name);
          return (
            <div key={sheet.id} style={{ display: "flex", alignItems: "center", gap: 14, background: C.panel, border: `1px solid ${sheet.status === "SUBMITTED" ? C.amber + "50" : C.border}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: color + "25", border: `1px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{initials(sheet.user?.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{sheet.user?.name}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{sheet.monthKey} · {sheet.entries?.length || 0} entrées</div>
              </div>
              <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{fmtHours(sheet.totalHours)}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.color + "20", padding: "3px 10px", borderRadius: 20, minWidth: 80, textAlign: "center" }}>{s.label}</span>
              {sheet.status === "SUBMITTED" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => act(sheet.id, "approve")} disabled={acting === sheet.id} style={{ padding: "7px 14px", borderRadius: 8, background: C.accentDim, border: `1px solid ${C.accentBorder}`, color: C.accent, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Approuver</button>
                  <button onClick={() => act(sheet.id, "reject", "Veuillez corriger les entrées")} disabled={acting === sheet.id} style={{ padding: "7px 14px", borderRadius: 8, background: C.red + "20", border: `1px solid ${C.red}40`, color: C.red, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Refuser</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leaves Page ───────────────────────────────────────────────────
function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "ANNUAL", fromDate: "", toDate: "", days: "", note: "" });
  const [saving, setSaving] = useState(false);

  function loadLeaves() {
    setLoading(true);
    apiFetch(`/api/leaves?month=${currentMonthKey()}`)
      .then(setLeaves)
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(loadLeaves, []);

  async function submit() {
    if (!form.fromDate || !form.toDate || !form.days) return;
    setSaving(true);
    try {
      await apiFetch("/api/leaves", { method: "POST", body: JSON.stringify({ ...form, days: +form.days }) });
      setShowForm(false);
      setForm({ type: "ANNUAL", fromDate: "", toDate: "", days: "", note: "" });
      loadLeaves();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  const typeLabels = { ANNUAL: "Congé annuel", SICK: "Maladie", UNPAID: "Sans solde", OTHER: "Autre" };
  const statusStyle = {
    PENDING:  { label: "En attente", color: C.amber },
    APPROVED: { label: "Approuvé",   color: C.accent },
    REJECTED: { label: "Refusé",     color: C.red },
  };

  return (
    <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Congés & Absences</h1>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: "8px 16px", borderRadius: 8, background: C.accent, border: "none", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Demande</button>
      </div>

      {showForm && (
        <div style={{ background: C.panel, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Type</label>
              <select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {[
              { key: "fromDate", label: "Du *", type: "date" },
              { key: "toDate",   label: "Au *", type: "date" },
              { key: "days",     label: "Nb jours *", type: "number", placeholder: "5" },
              { key: "note",     label: "Note", placeholder: "Optionnel" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 14px", borderRadius: 8, background: C.faint, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 13 }}>Annuler</button>
            <button onClick={submit} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, background: C.accent, border: "none", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{saving ? "Envoi…" : "Soumettre"}</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && [1,2].map(i => <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}><Skeleton /></div>)}
        {!loading && leaves.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Aucune demande ce mois</div>}
        {leaves.map(l => {
          const s = statusStyle[l.status];
          return (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentDim, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏖</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{typeLabels[l.type] || l.type}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{l.fromDate} → {l.toDate} · {l.days} jour{l.days > 1 ? "s" : ""}</div>
                {l.note && <div style={{ color: C.muted, fontSize: 12, fontStyle: "italic" }}>{l.note}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.color + "20", padding: "4px 10px", borderRadius: 20 }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function SafeClockApp() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState("timer");
  const [aiOpen, setAiOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Load global data
  function loadProjects() {
    setLoadingProjects(true);
    apiFetch("/api/projects")
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }
  function loadMembers() {
    setLoadingMembers(true);
    apiFetch("/api/members")
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
  }
  useEffect(() => {
    if (status === "authenticated") {
      loadProjects();
      loadMembers();
    }
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.accent, fontSize: 24 }}>⏱</div>
      </div>
    );
  }

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(session?.user?.role);

  const aiContext = {
    currentPage: page,
    user: { name: session?.user?.name, role: session?.user?.role },
    projects: projects.slice(0, 5),
    teamSize: members.length,
    month: currentMonthKey(),
  };

  const pageComponents = {
    timer:     <TimerPage projects={projects} />,
    timesheet: <TimesheetPage />,
    projects:  <ProjectsPage projects={projects} loading={loadingProjects} onRefresh={loadProjects} />,
    reports:   isManager ? <ReportsPage /> : null,
    team:      isManager ? <TeamPage members={members} loading={loadingMembers} onRefresh={loadMembers} /> : null,
    approval:  isManager ? <ApprovalPage /> : null,
    leaves:    <LeavesPage />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #2a3148; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <Sidebar page={page} setPage={setPage} session={session} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginRight: aiOpen ? 380 : 0, transition: "margin-right 0.25s" }}>
        <div style={{ height: 52, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setAiOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 8, background: aiOpen ? C.accentDim : C.faint, border: `1px solid ${aiOpen ? C.accentBorder : C.border}`, color: aiOpen ? C.accent : C.muted, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
            <span>✦</span> Assistant IA
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {pageComponents[page] || <div style={{ padding: 28, color: C.muted }}>Page non disponible</div>}
        </div>
      </div>

      {aiOpen && <AIPanel context={aiContext} onClose={() => setAiOpen(false)} />}
    </div>
  );
}
