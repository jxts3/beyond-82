import { useState, useEffect, useRef } from "react";

// ── Design tokens (mirrors src/index.css :root) ────────────────
const C = {
  bg:      "var(--bg-base)",
  card:    "var(--bg-panel)",
  border:  "var(--border)",
  inner:   "var(--bg-panel)",
  text:    "var(--text-primary)",
  muted:   "var(--text-muted)",
  gold:    "var(--gold)",
  goldBright: "var(--gold-bright)",
  grey:    "var(--grey)",
};

// ── Color helpers ─────────────────────────────────────────────
// Single hue (brass gold), hierarchy via lightness only:
// 25th percentile -> pale gold, 99th percentile -> deep bronze.
function pctileColor(p) {
  const v = Math.max(0, Math.min(100, p ?? 50));
  const lightness = 78 - (v / 100) * 50;
  return `hsl(42, 65%, ${lightness}%)`;
}
function ordinal(n) {
  const s = ["th","st","nd","rd"], v = n%100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}
// scales = elevates in the playoffs (gold), falls_off = declines (grey) -
// the app's one accent hue plus its one muted "declining" grey, no
// second/third color introduced for this distinction.
function predColors(binary) {
  return binary === "scales"
    ? { bg: "rgba(201,162,39,0.12)", border: C.gold, text: C.goldBright }
    : { bg: "rgba(140,130,112,0.12)", border: C.grey, text: C.grey };
}

// ── Scroll reveal wrapper (shared technique across all Arena
// sections: clip-path inset wipe + opacity, IntersectionObserver) ──
function Reveal({ children, className = "", style = {} }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setInView(true); });
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "in-view" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

// ── Position tag (angular, real bucket data - guard/wing/big) ──
function PositionTag({ pos }) {
  const short = { guard: "G", wing: "W", big: "B" }[pos] || (pos || "—").toUpperCase();
  return (
    <span className="font-mono angular-tag" style={{
      fontSize: 12, fontWeight: 700, color: C.gold, border: `1px solid ${C.gold}`,
      padding: "2px 8px", background: "rgba(201,162,39,0.08)",
    }}>{short}</span>
  );
}

// ── Team name badge (angular) ───────────────────────────────────
function NameBadge({ children }) {
  return (
    <span className="angular-tag" style={{
      display: "inline-block", background: C.gold, color: C.bg,
      fontSize: 11, fontWeight: 700, padding: "3px 11px", marginBottom: 8,
    }}>{children}</span>
  );
}

// ── Label badge ───────────────────────────────────────────────
function LabelBadge({ label }) {
  const map = {
    "16_game":  { text: C.goldBright, border: C.goldBright, display: "16-GAME" },
    both:       { text: C.gold,       border: C.gold,       display: "BOTH" },
    "82_game":  { text: C.grey,       border: C.grey,       display: "82-GAME" },
    scales:     { text: C.goldBright, border: C.goldBright, display: "SCALES" },
    falls_off:  { text: C.grey,       border: C.grey,       display: "FALLS OFF" },
  };
  const s = map[label] || { text: C.muted, border: C.border, display: label };
  return (
    <span className="font-mono angular-tag" style={{ padding: "2px 8px", background: "rgba(0,0,0,0.2)", border: `1px solid ${s.border}`, color: s.text, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
      {s.display}
    </span>
  );
}

// ── Percentile bar - real filled bar, width AND color encode pct ─
function StatRow({ label, value, pctile, format = v => (v > 0 ? "+" : "") + v.toFixed(1) }) {
  const color = pctileColor(pctile);
  const sp = pctile ?? 50;
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span className="font-mono" style={{ fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: C.text }}>{format(value ?? 0)}</span>
          <span style={{ color, marginLeft: 8 }}>{ordinal(sp)}</span>
        </span>
      </div>
      <div className="pctl-track">
        <div className="pctl-fill" style={{ width: `${sp}%`, background: color, boxShadow: `0 0 6px ${color}` }}/>
      </div>
    </div>
  );
}

// ── Radar chart ───────────────────────────────────────────────
function RadarChart({ dims, size = 150 }) {
  const cx = size/2, maxR = size/2 - 26, step = (Math.PI*2)/dims.length;
  const pt = (pct, i) => {
    const a = i*step - Math.PI/2, r = (Math.max(0,Math.min(100,pct))/100)*maxR;
    return { x: cx + r*Math.cos(a), y: cx + r*Math.sin(a) };
  };
  const lp = i => { const a = i*step - Math.PI/2; return { x: cx+(maxR+16)*Math.cos(a), y: cx+(maxR+16)*Math.sin(a) }; };
  const poly = dims.map((d,i) => pt(d.pctile,i));
  const polyStr = poly.map(p => `${p.x},${p.y}`).join(" ");
  const ring = lvl => dims.map((_,i) => { const a=i*step-Math.PI/2,r=maxR*lvl; return `${cx+r*Math.cos(a)},${cx+r*Math.sin(a)}`; }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.33,0.66,1].map((l,i)=><polygon key={i} points={ring(l)} fill="none" stroke="#2A3831" strokeWidth="1"/>)}
      {dims.map((_,i)=>{ const a=i*step-Math.PI/2; return <line key={i} x1={cx} y1={cx} x2={cx+maxR*Math.cos(a)} y2={cx+maxR*Math.sin(a)} stroke="#2A3831" strokeWidth="1"/>; })}
      <polygon points={polyStr} fill={C.gold} fillOpacity="0.18" stroke={C.gold} strokeWidth="1.5"/>
      {poly.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2.5" fill={C.gold}/>)}
      {dims.map((d,i)=>{ const l=lp(i); return <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={C.muted} fontFamily="'Azeret Mono',monospace">{d.label}</text>; })}
    </svg>
  );
}

// ── Basic stats grid ──────────────────────────────────────────
function BasicStatsGrid({ p }) {
  const stats = [
    {l:"PPG",v:p.ppg},{l:"RPG",v:p.rpg},{l:"APG",v:p.apg},{l:"SPG",v:p.spg},
    {l:"BPG",v:p.bpg},{l:"TOPG",v:p.topg},{l:"MPG",v:p.mpg},{l:"GP",v:p.gp},
  ];
  const pcts = [
    {l:"FG%",v:p.fg_pct},{l:"3P%",v:p.fg3_pct},{l:"FT%",v:p.ft_pct},{l:"TS%",v:p.ts_pct},
  ];
  const cell = (l,v) => (
    <div key={l} className="angular-sm" style={{ background: "rgba(0,0,0,0.18)", padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{l}</div>
      <div className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{(v||0).toFixed(l==="GP"?0:1)}{l.includes("%")?"%":""}</div>
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Standard Stats</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 6 }}>
        {stats.map(s=>cell(s.l,s.v))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 16 }}>
        {pcts.map(s=>cell(s.l,s.v))}
      </div>
    </div>
  );
}

// ── Playoff Ascension - regular season vs playoff swing, shown as
// bars rising above (gold, glowing) or falling below (grey) a
// tilted floor-grid baseline. Built from the real oo_off/oo_def
// (regular season on/off) vs po_rORTG/po_rDRTG (playoff on-court
// rating) percentiles already computed in the data pipeline, since
// those are the one directly-comparable, unit-less pair available.
function AscensionChart({ p }) {
  const dims = [
    { label: "Offense", rs: p.oo_off_pctile, po: p.po_rORTG_pctile },
    { label: "Defense", rs: p.oo_def_pctile, po: p.po_rDRTG_pctile },
  ].filter(d => d.rs != null && d.po != null && (d.rs !== 0 || d.po !== 0));

  if (dims.length === 0) {
    return <div style={{ color: C.muted, fontSize: 12, paddingTop: 4 }}>Not enough playoff floor time on record to project ascension.</div>;
  }

  const maxBar = 46;
  return (
    <div>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-end", height: maxBar*2 + 30, padding: "0 6px", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: maxBar + 15, height: 1, background: C.gold, opacity: 0.5 }}/>
        <div style={{
          position: "absolute", left: 0, right: 0, top: maxBar + 16, height: maxBar,
          backgroundImage: "repeating-linear-gradient(100deg, rgba(201,162,39,0.07) 0px, rgba(201,162,39,0.07) 1px, transparent 1px, transparent 14px)",
        }}/>
        {dims.map(d => {
          const delta = d.po - d.rs;
          const h = Math.min(maxBar, Math.max(4, (Math.abs(delta)/100)*maxBar*2));
          const rising = delta >= 0;
          return (
            <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70, zIndex: 1 }}>
              <div style={{ height: maxBar, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {rising && <div style={{ width: 34, height: h, background: `linear-gradient(180deg, ${C.goldBright}, ${C.gold})`, boxShadow: `0 0 12px ${C.gold}`, clipPath: "polygon(6px 0, 100% 0, 100% 100%, 0 100%)" }}/>}
              </div>
              <div style={{ height: maxBar, width: "100%", display: "flex", justifyContent: "center" }}>
                {!rising && <div style={{ width: 34, height: h, background: C.grey, opacity: 0.75, clipPath: "polygon(0 0, 100% 0, 100% 100%, 6px 100%)" }}/>}
              </div>
              <div className="font-mono" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: rising ? C.goldBright : C.grey }}>{delta > 0 ? "+" : ""}{delta.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Playoff on-court rating percentile vs. regular season on/off percentile, per 100 possessions.</div>
    </div>
  );
}

// ── Tabbed expanded card ──────────────────────────────────────
const TABS = ["Overview","RAPM","Scores","Playoff","Shot Profile"];

function ExpandedCard({ p }) {
  const [tab, setTab] = useState("Overview");
  const [fading, setFading] = useState(false);
  const dims = [
    { label: "RAPM",   pctile: p.recent_rapm_pctile ?? 50 },
    { label: "DEF",    pctile: p.oo_def_pctile ?? 50 },
    { label: "OFF",    pctile: p.oo_off_pctile ?? 50 },
    { label: "CONN",   pctile: p.ast_p100_pctile ?? 50 },
    { label: "CLUTCH", pctile: p.clutch_plus_minus_pctile ?? 50 },
    { label: "SHOT",   pctile: p.catch_shoot_fg_pctile ?? 50 },
  ];

  const switchTab = (t) => {
    if (t === tab) return;
    setFading(true);
    setTimeout(() => { setTab(t); setFading(false); }, 180);
  };

  return (
    <div style={{ paddingTop: 14 }} onClick={e => e.stopPropagation()}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => switchTab(t)} className={`tab-btn ${tab===t ? "active" : ""}`}>{t}</button>
        ))}
      </div>

      <div className="tab-panel" style={{ opacity: fading ? 0 : 1 }}>
      {/* Overview */}
      {tab === "Overview" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <RadarChart dims={dims} size={140}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Player Profile</div>
              {dims.map(d => (
                <div key={d.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{d.label}</span>
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: pctileColor(d.pctile) }}>{ordinal(d.pctile)}</span>
                </div>
              ))}
            </div>
          </div>
          <BasicStatsGrid p={p}/>
        </div>
      )}

      {/* RAPM */}
      {tab === "RAPM" && (
        <div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>RAPM</div>
          <StatRow label="Overall RAPM"   value={p.recent_rapm}  pctile={p.recent_rapm_pctile}/>
          <StatRow label="Prime RAPM"     value={p.prime_rapm}   pctile={p.prime_rapm_pctile}/>
          <StatRow label="Offensive RAPM" value={p.recent_orapm} pctile={p.recent_orapm_pctile}/>
          <StatRow label="Defensive RAPM" value={p.recent_drapm} pctile={p.recent_drapm_pctile}/>
          <StatRow label="3Y Off RAPM"    value={p.o3_orapm}     pctile={p.o3_orapm_pctile}/>
          <StatRow label="3Y Def RAPM"    value={p.d3_drapm}     pctile={p.d3_drapm_pctile}/>
          <StatRow label="3Y dTS"         value={p.d3_dTS}       pctile={p.d3_dTS_pctile}/>
          <StatRow label="3Y dTOV"        value={p.d3_dTOV}      pctile={p.d3_dTOV_pctile}/>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Regular Season On/Off <span style={{ color: C.grey, textTransform: "none", fontSize: 9 }}>(not playoff-specific)</span></div>
            <StatRow label="Net On/Off" value={p.oo_net} pctile={p.oo_net_pctile}/>
            <StatRow label="Def On/Off" value={p.oo_def} pctile={p.oo_def_pctile}/>
            <StatRow label="Off On/Off" value={p.oo_off} pctile={p.oo_off_pctile}/>
          </div>
        </div>
      )}

      {/* Composite Scores */}
      {tab === "Scores" && (
        <div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Composite Scores</div>
          <StatRow label="Defensive Score"    value={p.def_score}  pctile={p.def_score_pctile}/>
          <StatRow label="Offensive Score"    value={p.off_score}  pctile={p.off_score_pctile}/>
          <StatRow label="Connectivity Score" value={p.conn_score} pctile={p.conn_score_pctile}/>
          {p.on_ball_pct > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Passing & Connectivity</div>
              <StatRow label="On-Ball Time %" value={p.on_ball_pct} pctile={p.on_ball_pct_pctile} format={v=>v.toFixed(1)+"%"}/>
              <StatRow label="Pot AST / 100"  value={p.pot_ast}    pctile={p.pot_ast_pctile}/>
              <StatRow label="AST / 100"      value={p.ast_p100}   pctile={p.ast_p100_pctile}/>
            </div>
          )}
          {p.wingspan > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Physical Tools</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {[
                  { l: "Wingspan", v: `${(p.wingspan/12).toFixed(1)}'` },
                  { l: "WS Ratio", v: p.wingspan_ratio?.toFixed(3) ?? "—" },
                ].map(s => (
                  <div key={s.l} className="angular-sm" style={{ background: "rgba(0,0,0,0.18)", padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>{s.l}</div>
                    <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Playoff Context */}
      {tab === "Playoff" && (
        <div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Playoff Rating Context <span style={{ color: C.grey, textTransform: "none", fontSize: 9 }}>(team rating while on floor, playoff games)</span>
          </div>
          <StatRow label="PO Def Rating" value={p.po_rDRTG} pctile={p.po_rDRTG_pctile}/>
          <StatRow label="PO Off Rating" value={p.po_rORTG} pctile={p.po_rORTG_pctile}/>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Playoff Ascension</div>
            <AscensionChart p={p}/>
          </div>

          {(p.clutch_plus_minus !== 0 || p.clutch_pts !== 0) && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Clutch Performance</div>
              <StatRow label="Clutch +/-" value={p.clutch_plus_minus} pctile={p.clutch_plus_minus_pctile}/>
              {p.clutch_pts > 0 && <StatRow label="Clutch PPG" value={p.clutch_pts} pctile={p.clutch_plus_minus_pctile} format={v=>v.toFixed(1)}/>}
              {p.clutch_fg_pct > 0 && <StatRow label="Clutch FG%" value={p.clutch_fg_pct} pctile={p.clutch_plus_minus_pctile} format={v=>(v*100).toFixed(1)+"%"}/>}
            </div>
          )}

          {p.def_impact !== 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Defensive Matchup</div>
              <StatRow label="Def Impact (vs normal)" value={p.def_impact}        pctile={p.def_impact_pctile}   format={v=>(v*100).toFixed(1)+"%"}/>
              <StatRow label="Opp FG% When Guarding"  value={p.def_d_fg_pct}     pctile={p.def_impact_pctile}   format={v=>(v*100).toFixed(1)+"%"}/>
              <StatRow label="Opp Normal FG%"         value={p.def_normal_fg_pct} pctile={50}                   format={v=>(v*100).toFixed(1)+"%"}/>
            </div>
          )}
        </div>
      )}

      {/* Shot Profile */}
      {tab === "Shot Profile" && (
        <div>
          {p.catch_shoot_fg > 0 ? (
            <>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Creation Type</div>
              <StatRow label="Catch & Shoot FG%" value={p.catch_shoot_fg}   pctile={p.catch_shoot_fg_pctile}   format={v=>(v*100).toFixed(1)+"%"}/>
              <StatRow label="C&S Frequency"     value={p.catch_shoot_freq} pctile={p.catch_shoot_fg_pctile}   format={v=>(v*100).toFixed(1)+"%"}/>
              <StatRow label="Pullup FG%"         value={p.pullup_fg}        pctile={p.pullup_fg_pctile}        format={v=>(v*100).toFixed(1)+"%"}/>
              <StatRow label="Pullup Frequency"   value={p.pullup_freq}      pctile={p.pullup_fg_pctile}        format={v=>(v*100).toFixed(1)+"%"}/>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Shot Quality</div>
                <StatRow label="Contested FG%"   value={p.contested_fg}  pctile={p.contested_fg_pctile}  format={v=>(v*100).toFixed(1)+"%"}/>
                <StatRow label="Open FG%"         value={p.wide_open_fg}  pctile={p.wide_open_fg_pctile}  format={v=>(v*100).toFixed(1)+"%"}/>
                {p.pct_ast_3pm !== undefined && (
                  <StatRow label="% 3s Unassisted" value={p.pct_uast_3pm} pctile={50} format={v=>(v*100).toFixed(0)+"%"}/>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Shot Zones</div>
                {[
                  { l: "Restricted Area",    fga: p.ra_fga,      fg: p.ra_fg_pct,     pctile: p.ra_fg_pct_pctile },
                  { l: "Paint (Non-RA)",     fga: p.paint_fga,   fg: p.paint_fg_pct,  pctile: 50 },
                  { l: "Mid-Range",          fga: p.mid_fga,     fg: p.mid_fg_pct,    pctile: p.mid_fg_pct_pctile },
                  { l: "Corner 3",           fga: p.corner3_fga, fg: p.corner3_fg_pct,pctile: p.corner3_fg_pct_pctile },
                  { l: "Above Break 3",      fga: p.ab3_fga,     fg: p.ab3_fg_pct,    pctile: p.ab3_fg_pct_pctile },
                ].map(z => z.fga > 0 && (
                  <div key={z.l} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{z.l}</span>
                      <span className="font-mono" style={{ fontSize: 11, color: C.text, display: "flex", gap: 8 }}>
                        <span style={{ color: C.muted }}>{z.fga.toFixed(1)} att</span>
                        <span style={{ color: pctileColor(z.pctile), fontWeight: 600 }}>{(z.fg*100).toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: C.muted, fontSize: 12, paddingTop: 8 }}>Shot profile data not available for this player's peak season.</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────
function PlayerCard({ p, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const pc = predColors(p.binary);

  return (
    <div className="angular" style={{ position: "relative", background: C.card, border: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer" }}
         onClick={() => setExpanded(e => !e)}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: pc.text }} />
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {p.team && p.team !== "N/A" && <NameBadge>{p.team}</NameBadge>}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <div className="font-display" style={{ fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <PositionTag pos={p.pos}/>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <LabelBadge label={p.binary}/>
              <LabelBadge label={p.label}/>
            </div>
          </div>
          <div className="angular-sm" style={{ display: "flex", flexDirection: "column", alignItems: "center", background: pc.bg, border: `1px solid ${pc.border}`, padding: "5px 10px", minWidth: 62, marginLeft: 10 }}>
            <span style={{ fontSize: 8, color: pc.text, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.binary === "scales" ? "SCALES" : "FALLS OFF"}</span>
            <span className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: pc.text, lineHeight: 1.1 }}>{p.confidence}%</span>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="font-mono" style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 10, color: C.muted }}>
              RAPM <span style={{ color: pctileColor(p.recent_rapm_pctile), fontWeight: 600 }}>{p.recent_rapm > 0 ? "+" : ""}{(p.recent_rapm||0).toFixed(1)}</span>
            </span>
            {p.ppg > 0 && <span style={{ fontSize: 10, color: C.muted }}>{p.ppg.toFixed(1)} <span style={{ color: C.grey }}>PPG</span></span>}
          </div>
          {p.rising && <span className="angular-tag" style={{ fontSize: 9, color: C.goldBright, background: "rgba(201,162,39,0.1)", border: `1px solid ${C.gold}`, padding: "2px 7px" }}>↑ RISING</span>}
          <span style={{ fontSize: 9, color: C.muted, marginLeft: "auto" }}>{expanded ? "▲ LESS" : "▼ MORE"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          <ExpandedCard p={p}/>
        </div>
      )}
    </div>
  );
}

// ── Playoff tab ───────────────────────────────────────────────
function PlayoffTab({ players }) {
  const [filter, setFilter] = useState("all");
  const [pos, setPos]       = useState("all");
  const [sort, setSort]     = useState("recent_rapm");
  const [search, setSearch] = useState("");

  const filtered = players
    .filter(p => filter==="all" || p.binary===filter || p.label===filter)
    .filter(p => pos==="all" || p.pos===pos)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.team||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (b[sort]||0) - (a[sort]||0));

  const btn = (active, label, onClick) => (
    <button key={label} onClick={onClick} className={`tab-btn ${active ? "active" : ""}`} style={{ fontSize: 9, padding: "6px 12px" }}>{label}</button>
  );

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or team..."
        className="angular-sm"
        style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", marginBottom: 14, boxSizing: "border-box" }}/>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {["all","scales","falls_off","16_game","both","82_game"].map(f => btn(filter===f, f.replace(/_/g," "), ()=>setFilter(f)))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        {["all","guard","wing","big"].map(p => btn(pos===p, p, ()=>setPos(p)))}
        <select value={sort} onChange={e => setSort(e.target.value)} className="angular-sm"
          style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, padding: "6px 10px", fontSize: 11, outline: "none" }}>
          <option value="recent_rapm">Sort: RAPM</option>
          <option value="def_score">Sort: Def Score</option>
          <option value="off_score">Sort: Off Score</option>
          <option value="conn_score">Sort: Connectivity</option>
          <option value="prime_rapm">Sort: Prime RAPM</option>
        </select>
        <span className="font-mono" style={{ fontSize: 11, color: C.muted }}>{filtered.length} players</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
        {filtered.map(p => <PlayerCard key={p.name} p={p}/>)}
      </div>
    </div>
  );
}

// ── Lookup tab ────────────────────────────────────────────────
function LookupTab({ players }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    setResults(players.filter(p => p.name.toLowerCase().includes(q) || (p.team||"").toLowerCase().includes(q)));
    setSearched(true);
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Search any current role player to see their playoff scaling projection.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSearch()}
          placeholder="Player name or team..." className="angular-sm"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, padding: "11px 15px", color: C.text, fontSize: 14, outline: "none" }}/>
        <button onClick={handleSearch} className="font-display angular-sm"
          style={{ background: C.gold, color: C.bg, border: "none", padding: "11px 24px", fontSize: 11, cursor: "pointer", letterSpacing: "0.04em" }}>PROJECT</button>
      </div>
      {searched && results.length === 0 && (
        <div className="angular" style={{ background: C.card, border: `1px solid ${C.grey}`, padding: 18, color: C.grey, fontSize: 13, textAlign: "center" }}>
          No player found — they may not have enough RAPM data yet.
        </div>
      )}
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
          {results.map(p => <PlayerCard key={p.name} p={p} defaultExpanded={results.length===1}/>)}
        </div>
      )}
      {!searched && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Recent Projections</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
            {players.slice(0,9).map(p => <PlayerCard key={p.name} p={p}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Model tab ─────────────────────────────────────────────────
function ModelTab({ summary, importance }) {
  const metrics = [
    { l: "CV Accuracy",      v: `${summary.accuracy}%` },
    { l: "Training Players", v: summary.n_players },
    { l: "Features",         v: summary.n_features },
    { l: "Falls Off Recall", v: `${summary.falls_recall}%` },
    { l: "Scales Recall",    v: `${summary.scales_recall}%` },
    { l: "Era",              v: `${summary.era_start}–${summary.era_end}` },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 22 }}>
        {metrics.map(m => (
          <div key={m.l} className="angular-sm" style={{ background: C.card, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{m.l}</div>
            <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: C.gold }}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="angular" style={{ background: C.card, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Feature Importance</div>
        {importance.map((f,i) => (
          <div key={f.feature} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text }}>{f.feature}</span>
              <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: i < 3 ? C.gold : C.muted }}>{f.importance}%</span>
            </div>
            <div className="pctl-track">
              <div className="pctl-fill" style={{ width: `${(f.importance/importance[0].importance)*100}%`, background: i < 3 ? C.gold : C.grey }}/>
            </div>
          </div>
        ))}
      </div>

      <div className="angular" style={{ background: C.card, border: `1px solid ${C.border}`, padding: 18 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Label Definitions</div>
        {[
          ["16-GAME", "Elevates in the playoffs — more minutes, more trust, more impact.", C.goldBright],
          ["BOTH",    "Consistent in both settings. Reliable role player, not a liability.", C.gold],
          ["82-GAME", "Falls off in playoffs. Gets schemed out, benched, or phased out.", C.grey],
        ].map(([t,d,c]) => (
          <div key={t} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: c, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Home screen ───────────────────────────────────────────────
function HomeScreen({ labeled, projected, onNavigate }) {
  const topScalers = [...labeled]
    .filter(p => p.binary === "scales")
    .sort((a,b) => (b.recent_rapm||0) - (a.recent_rapm||0))
    .slice(0, 6);

  const stats = [
    { v: "159", l: "Labeled Players" },
    { v: "331", l: "Active Projections" },
    { v: "84.3%", l: "CV Accuracy" },
    { v: "2011–26", l: "Era Coverage" },
  ];

  const features = [
    { title: "Playoff Players", desc: "Browse all 159 historically labeled role players with full RAPM, on/off, and shot profile data.", tag: "159 Players", nav: "playoff" },
    { title: "Player Lookup", desc: "Project any current NBA role player. Search by name or team to see their playoff scaling forecast.", tag: "331 Active", nav: "lookup" },
    { title: "Model Info", desc: "84.3% CV accuracy across 50 folds. GradientBoosting trained on RAPM, on/off splits, clutch, and shot data.", tag: "v4c", nav: "model" },
    { title: "Top Scalers", desc: "The current role players most likely to elevate when the regular season ends and the real game begins.", tag: "Elite Tier", nav: "scalers" },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ minHeight: "62vh", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.border}` }}>
        <div className="hero-bar-sweep"/>
        <h1 className="font-display hero-title-slide hero-h1" style={{ color: C.text, lineHeight: 1.25, margin: "0 0 16px" }}>
          Know Your Roster<br/>
          <span style={{ color: C.gold }}>Before the Playoffs Start.</span>
        </h1>
        <p className="hero-fade-in" style={{ fontSize: 15, color: C.muted, maxWidth: 480, margin: "0 0 32px", lineHeight: 1.7 }}>
          An NBA playoff scaling model that predicts which role players elevate, hold steady, or fall off when it matters most. 84.3% accuracy across 490 players.
        </p>
        <div className="hero-fade-in" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => onNavigate("playoff")} className="font-display angular-sm"
            style={{ background: C.gold, color: C.bg, border: "none", padding: "13px 28px", fontSize: 11, cursor: "pointer", letterSpacing: "0.04em" }}>
            Browse Players →
          </button>
          <button onClick={() => onNavigate("lookup")} className="angular-sm"
            style={{ background: "transparent", color: C.text, border: `1px solid ${C.border}`, padding: "13px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Project a Player
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: `1px solid ${C.border}` }}>
          {stats.map((s,i) => (
            <div key={s.l} style={{ padding: "22px 0", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
              <div className="font-mono" style={{ fontSize: 26, fontWeight: 800, color: C.gold, marginBottom: 4 }}>{s.v}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Feature cards */}
      <Reveal style={{ padding: "48px 0 32px" }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 20 }}>What Beyond 82 Offers</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {features.map(f => (
            <div key={f.title} onClick={() => onNavigate(f.nav)} className="angular"
              style={{ background: C.card, border: `1px solid ${C.border}`, padding: "20px", cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div className="font-display" style={{ fontSize: 13, color: C.text }}>{f.title}</div>
                <span className="angular-tag" style={{ fontSize: 9, color: C.goldBright, background: "rgba(201,162,39,0.1)", border: `1px solid ${C.gold}`, padding: "2px 7px", fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{f.tag}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{f.desc}</div>
              <div style={{ marginTop: 14, fontSize: 11, color: C.gold, fontWeight: 600 }}>Explore →</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Top Scalers preview */}
      <Reveal style={{ padding: "0 0 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Top Scalers — Active Players</div>
          <button onClick={() => onNavigate("scalers")} style={{ fontSize: 11, color: C.gold, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View all →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
          {topScalers.map(p => <PlayerCard key={p.name} p={p}/>)}
        </div>
      </Reveal>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────
function Nav({ page, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const links = [
    { id: "home",    label: "Home" },
    { id: "playoff", label: "Playoff Players" },
    { id: "lookup",  label: "Player Lookup" },
    { id: "scalers", label: "Top Scalers" },
    { id: "model",   label: "Model" },
  ];

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(15,29,23,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>
        <div onClick={() => onNavigate("home")} className="font-display" style={{ fontSize: 15, color: C.text, cursor: "pointer" }}>
          Beyond <span style={{ color: C.gold }}>82</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} className="desktop-nav">
          {links.slice(1).map(l => (
            <button key={l.id} onClick={() => onNavigate(l.id)} className="font-display" style={{
              padding: "6px 12px", fontSize: 9, letterSpacing: "0.04em",
              cursor: "pointer", background: "transparent", border: "none",
              color: page===l.id ? C.gold : C.muted,
              borderBottom: page===l.id ? `2px solid ${C.gold}` : "2px solid transparent",
            }}>{l.label}</button>
          ))}
        </div>

        {/* Hamburger */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(o => !o)} className="angular-sm"
            style={{ background: C.card, border: `1px solid ${C.border}`, padding: "8px 10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 18, height: 2, background: menuOpen ? C.gold : C.muted, transition: "background 0.2s" }}/>
            ))}
          </button>

          {menuOpen && (
            <div className="angular-sm" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 220, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "10px 14px 6px", fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Navigation</div>
              {links.map(l => (
                <button key={l.id} onClick={() => { onNavigate(l.id); setMenuOpen(false); }} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 14px", fontSize: 13, fontWeight: page===l.id ? 700 : 400,
                  color: page===l.id ? C.gold : C.text, background: page===l.id ? "rgba(201,162,39,0.08)" : "transparent",
                  border: "none", cursor: "pointer",
                  borderLeft: page===l.id ? `2px solid ${C.gold}` : "2px solid transparent",
                }}>{l.label}</button>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 14px" }}>
                <div className="font-mono" style={{ fontSize: 10, color: C.muted }}>Beyond 82 — v4c, 84.3% accuracy</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Top Scalers page ──────────────────────────────────────────
function ScalersTab({ labeled, projected }) {
  const all = [...labeled, ...projected]
    .filter(p => p.binary === "scales" && p.team && p.team !== "N/A")
    .sort((a,b) => (b.confidence||0) - (a.confidence||0))
    .slice(0, 30);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="font-display" style={{ fontSize: 20, color: C.text, marginBottom: 8 }}>Top Scalers</div>
        <div style={{ fontSize: 13, color: C.muted }}>Current active players most likely to elevate in the playoffs, ranked by model confidence.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
        {all.map(p => <PlayerCard key={p.name} p={p}/>)}
      </div>
    </div>
  );
}

// ── Root app ──────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState("home");
  const [labeled, setLabeled]     = useState([]);
  const [projected, setProjected] = useState([]);
  const [importance, setImportance] = useState([]);
  const [summary, setSummary]     = useState({});

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/labeled.json`).then(r=>r.json()).then(setLabeled).catch(()=>{});
    fetch(`${base}data/projected.json`).then(r=>r.json()).then(setProjected).catch(()=>{});
    fetch(`${base}data/feature_importance.json`).then(r=>r.json()).then(setImportance).catch(()=>{});
    fetch(`${base}data/model_summary.json`).then(r=>r.json()).then(setSummary).catch(()=>{});
  }, []);

  const navigate = id => { setPage(id); window.scrollTo(0,0); };

  const pageTitle = {
    home:    null,
    playoff: "Playoff Players",
    lookup:  "Player Lookup",
    scalers: null,
    model:   "Model",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Work Sans',-apple-system,sans-serif", color: C.text }}>
      <Nav page={page} onNavigate={navigate}/>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        {pageTitle[page] && (
          <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
            <div className="font-display" style={{ fontSize: 19, color: C.text }}>{pageTitle[page]}</div>
          </div>
        )}
        <div style={{ paddingBottom: 60 }}>
          {page === "home"    && <HomeScreen labeled={labeled} projected={projected} onNavigate={navigate}/>}
          {page === "playoff" && <PlayoffTab players={labeled}/>}
          {page === "lookup"  && <LookupTab players={projected}/>}
          {page === "scalers" && <ScalersTab labeled={labeled} projected={projected}/>}
          {page === "model"   && <ModelTab summary={summary} importance={importance}/>}
        </div>
      </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.muted }}>Beyond 82 — built by Jesse Igbide. v4c, 84.3% CV accuracy, 490 players, 2011–2026.</div>
      </footer>
    </div>
  );
}
