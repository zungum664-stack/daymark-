import { useState } from "react";
import { ArrowUpRight, BookOpen, Landmark, Sprout } from "lucide-react";
import { formatRand } from "../lib/expenses";

const GOAL_KEY = "daymark_savings_goal_v1";

const GUIDES = [
  {
    icon: Landmark,
    kicker: "SAVING",
    title: "High-interest savings",
    summary: "Keep emergency cash separate from daily spending so you earn interest every month.",
    tip: "Keep 1 to 3 months of essential bills in an instant-access high-yield savings pocket. Automate a small transfer on payday before spending on extras.",
    link: { label: "Compare savings tips (MoneySmart SA)", href: "https://moneysmart.co.za" }
  },
  {
    icon: Sprout,
    kicker: "INVESTING",
    title: "Tax-free & index investing",
    summary: "A plain-language starting point for growing long-term wealth without high fees.",
    tip: "Start small and stay consistent—even small weekly amounts compound over 5 to 10 years. Use tax-advantaged accounts first (such as a Tax-Free Savings Account in SA, ISA in the UK, or Roth IRA in the US).",
    link: { label: "Learn about Tax-Free Savings (SARS)", href: "https://sars.gov.za" }
  },
  {
    icon: BookOpen,
    kicker: "BUDGETING GUIDE",
    title: "The 50 / 30 / 20 payday survival guide",
    summary: "A practical guide for making payday stretch to payday without complicated spreadsheets.",
    tip: "Divide every paycheck simply: 50% Needs (rent, food, transport, electricity, data), 30% Wants (eating out, entertainment), and 20% Future You (your emergency jar, debt payoff, and savings).",
    link: { label: "Free financial literacy guides (FSCA)", href: "https://fscamymoney.co.za" }
  }
];

export function GrowRands() {
  const [goal, setGoal] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(GOAL_KEY) || "null") || { title: "Emergency Jar", target: 1000, saved: 0 };
    } catch {
      return { title: "Emergency Jar", target: 1000, saved: 0 };
    }
  });
  const [editG, setEditG] = useState(false);
  const [gTitle, setGTitle] = useState(goal.title);
  const [gTarget, setGTarget] = useState(String(goal.target));
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const addSave = (amt: number) => {
    const next = { ...goal, saved: Math.max(0, Math.round((goal.saved + amt) * 100) / 100) };
    setGoal(next);
    try { localStorage.setItem(GOAL_KEY, JSON.stringify(next)); } catch {}
  };

  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

  return (
    <section className="grow-section" aria-labelledby="grow-title">
      <div className="intro">
        <div className="eyebrow"><span className="eyebrow-line" /> NEXT STEPS FOR YOUR MONEY</div>
        <h1 id="grow-title">Grow<br /><em>your money.</em></h1>
        <p className="intro-copy">Useful next steps, for whenever you feel ready. No pressure, no products to buy here.</p>
      </div>

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(128,128,128,0.28)", background: "rgba(22,163,74,0.08)", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <strong style={{ fontSize: 15 }}>🫙 {goal.title}</strong>
          <button type="button" onClick={() => { setGTitle(goal.title); setGTarget(String(goal.target)); setEditG(!editG); }} style={{ fontSize: 12, background: "none", border: "1px solid rgba(128,128,128,0.35)", borderRadius: 6, padding: "2px 8px", color: "inherit", cursor: "pointer" }}>
            {editG ? "Close" : "Edit goal"}
          </button>
        </div>
        {editG ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            const t = Number(gTarget.replace(",", "."));
            if (!gTitle.trim() || !Number.isFinite(t) || t <= 0) return;
            const next = { ...goal, title: gTitle.trim(), target: Math.round(t * 100) / 100 };
            setGoal(next);
            try { localStorage.setItem(GOAL_KEY, JSON.stringify(next)); } catch {}
            setEditG(false);
          }} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <input value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="Goal name" style={{ flex: 1, minWidth: 110, padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 13 }} />
            <input inputMode="decimal" value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Target amount" style={{ width: 95, padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 13 }} />
            <button type="submit" style={{ padding: "5px 10px", borderRadius: 7, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, fontSize: 13 }}>Save</button>
          </form>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {formatRand(goal.saved)} <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.75 }}>of {formatRand(goal.target)} ({pct}%)</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(128,128,128,0.2)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#16a34a", transition: "width 0.3s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[10,20,50,100].map((a) => (
                <button key={a} type="button" onClick={() => addSave(a)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(22,163,74,0.45)", background: "rgba(22,163,74,0.12)", color: "inherit", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  + {formatRand(a).replace(/([.,]00)$/, "")}
                </button>
              ))}
              <button type="button" onClick={() => addSave(-goal.saved)} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.3)", background: "transparent", color: "inherit", fontSize: 12, opacity: 0.75, cursor: "pointer" }}>
                Reset
              </button>
            </div>
          </>
        )}
      </div>

      <div className="growth-grid">
        {GUIDES.map(({ icon: Icon, kicker, title, summary, tip, link }, index) => (
          <article className="growth-card" key={title} data-testid={`card-growth-${index + 1}`}>
            <span className="growth-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.65} /></span>
            <div className="growth-body">
              <span className="section-kicker">{kicker}</span>
              <h2>{title}</h2>
              <p>{summary}</p>
              <button type="button" onClick={() => setOpenIdx(openIdx === index ? null : index)} style={{ background: "none", border: "none", padding: 0, marginBottom: 8, color: "#16a34a", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                {openIdx === index ? "Hide quick tip ↑" : "Read quick tip ↓"}
              </button>
              {openIdx === index && (
                <p style={{ fontSize: 13, lineHeight: 1.5, padding: "8px 10px", borderRadius: 10, background: "rgba(128,128,128,0.1)", marginBottom: 10 }}>
                  {tip}
                </p>
              )}
              <a className="placeholder-link" href={link.href} target="_blank" rel="noopener noreferrer" data-testid={`link-growth-${index + 1}`} style={{ textDecoration: "none", fontWeight: 600 }}>
                {link.label}<ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>

      <p className="growth-note"><span className="note-mark" /> Daymark is a notebook, not financial advice.</p>
    </section>
  );
}
