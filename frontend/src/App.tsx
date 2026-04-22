import { useState, useEffect, useRef, useCallback } from "react";

// ── API ───────────────────────────────────────────────────────────────────────
const API  = "http://localhost:5000/api";
const get  = (p: string) => fetch(API + p).then(r => r.json());
const post = (p: string, b: Record<string, unknown> = {}) =>
  fetch(API + p, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => r.json());

// ── Types ─────────────────────────────────────────────────────────────────────
interface Prediction {
  participant: string; brochure_id: string; clicked_item: string;
  age: number; gender: string;
  reaction_time: number | null; gaze_x: number | null; gaze_y: number | null;
  brand_pct: number; familiarity_pct: number; price_pct: number;
  predicted_reason: string;
}
interface TrainingMeta { test_accuracy: number; cv_accuracy: number; cv_std: number; }
interface Summary {
  total_decisions: number; reason_counts: Record<string,number>;
  avg_brand_pct: number; avg_familiarity_pct: number; avg_price_pct: number;
  avg_reaction_time: number | null;
}
interface Results { predictions: Prediction[]; training: TrainingMeta; summary: Summary; }
interface ExpState  { status: "idle"|"running"|"complete"; participant_count: number; }
interface TrainState { status: "idle"|"running"|"complete"|"error"; log: string[]; results: Results|null; }

// ── Colour tokens ─────────────────────────────────────────────────────────────
const T = {
  brand:  "#2563EB", brandLt:  "#DBEAFE", brandDk: "#1E40AF",
  fam:    "#059669", famLt:    "#D1FAE5", famDk:   "#065F46",
  price:  "#DC2626", priceLt:  "#FEE2E2", priceDk: "#991B1B",
  ink:    "#0F172A", ink2:     "#334155", ink3: "#64748B",
  canvas: "#F8FAFC", card:     "#FFFFFF", border: "#E2E8F0",
  success:"#059669", warn:     "#D97706",
};
const RC: Record<string,string> = { Brand:T.brand, Familiarity:T.fam, Price:T.price };
const RL: Record<string,string> = { Brand:T.brandLt, Familiarity:T.famLt, Price:T.priceLt };

// ── Shared atoms ─────────────────────────────────────────────────────────────
function Pill({ label, color, bg }: { label:string; color:string; bg:string }) {
  return <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:bg, color, letterSpacing:"0.03em" }}>{label}</span>;
}

function ProgressBar({ value, color, height=8 }: { value:number; color:string; height?:number }) {
  return (
    <div style={{ height, background:T.border, borderRadius:99, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(value,100)}%`, background:color, borderRadius:99, transition:"width 1s ease" }} />
    </div>
  );
}

// Three-segment bar — the core visual for results
function TriBar({ b, f, p, height=14 }: { b:number; f:number; p:number; height?:number }) {
  const total = b + f + p || 1;
  return (
    <div>
      <div style={{ display:"flex", height, borderRadius:8, overflow:"hidden", gap:2 }}>
        {[{v:b,c:T.brand},{v:f,c:T.fam},{v:p,c:T.price}].map((s,i) => (
          <div key={i} style={{ flex:s.v/total, background:s.c, transition:"flex 1s ease", minWidth:s.v>0?4:0 }} />
        ))}
      </div>
      <div style={{ display:"flex", gap:16, marginTop:8 }}>
        {[{l:"Brand",v:b,c:T.brand},{l:"Familiarity",v:f,c:T.fam},{l:"Price",v:p,c:T.price}].map(s => (
          <div key={s.l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
            <div style={{ width:9, height:9, borderRadius:2, background:s.c, flexShrink:0 }} />
            <span style={{ color:T.ink3 }}>{s.l}</span>
            <span style={{ fontWeight:700, color:s.c }}>{s.v.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dot({ status }: { status:string }) {
  const c = { idle:"#94A3B8", running:T.fam, complete:T.fam, error:T.price }[status]||"#94A3B8";
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:c, marginRight:6, flexShrink:0,
    animation:status==="running"?"spin 1.5s ease-in-out infinite":"none" }} />;
}

function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:"20px 24px", ...style }}>{children}</div>;
}

function Stat({ label, value, color, sub }: { label:string; value:string|number; color?:string; sub?:string }) {
  return (
    <div style={{ background:T.canvas, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px" }}>
      <div style={{ fontSize:11, fontWeight:600, color:T.ink3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:color||T.ink, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.ink3, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

const PrimaryBtn = ({ children, onClick, disabled }: { children:React.ReactNode; onClick?:()=>void; disabled?:boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding:"11px 28px", background:disabled?T.ink3:T.brand, color:"#fff",
    border:"none", borderRadius:10, fontSize:14, fontWeight:700,
    cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit",
    transition:"all 0.15s", letterSpacing:"0.01em",
    opacity:disabled?0.6:1,
  }}>{children}</button>
);

const GhostBtn = ({ children, onClick }: { children:React.ReactNode; onClick?:()=>void }) => (
  <button onClick={onClick} style={{
    padding:"10px 24px", background:"transparent", color:T.ink2,
    border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:14,
    fontWeight:600, cursor:"pointer", fontFamily:"inherit",
  }}>{children}</button>
);

// ── Sidebar nav ───────────────────────────────────────────────────────────────
const NAV = [
  { key:"overview",   icon:"◈", label:"Overview" },
  { key:"experiment", icon:"⬡", label:"Experiment" },
  { key:"training",   icon:"◎", label:"Train Model" },
  { key:"results",    icon:"◉", label:"Results" },
];

function Sidebar({ page, setPage, expState, trainState }:
  { page:string; setPage:(p:string)=>void; expState:ExpState; trainState:TrainState }) {
  const statusOf = (key:string) => {
    if (key==="experiment") return expState.status;
    if (key==="training")   return trainState.status;
    if (key==="results")    return trainState.results ? "complete" : "idle";
    return "idle";
  };
  return (
    <nav style={{ width:220, minHeight:"100vh", background:T.ink, display:"flex", flexDirection:"column", padding:"32px 0", flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding:"0 24px 32px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#fff", letterSpacing:"0.08em", textTransform:"uppercase" }}>NeuroMark</div>
        <div style={{ fontSize:10, color:"#64748B", marginTop:3, letterSpacing:"0.04em" }}>Research Platform</div>
      </div>
      {NAV.map(n => {
        const active  = page===n.key;
        const st      = statusOf(n.key);
        const dotColor = { idle:"#334155", running:T.fam, complete:"#22D3EE", error:T.price }[st]||"#334155";
        return (
          <button key={n.key} onClick={() => setPage(n.key)} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"12px 24px", border:"none", background:active?"rgba(255,255,255,0.08)":"transparent",
            color:active?"#fff":"#94A3B8", cursor:"pointer", fontFamily:"inherit",
            fontSize:13, fontWeight:active?600:400, textAlign:"left",
            borderLeft:active?`3px solid ${T.brand}`:"3px solid transparent",
            transition:"all 0.15s",
          }}>
            <span style={{ fontSize:16, opacity:active?1:0.6 }}>{n.icon}</span>
            <span style={{ flex:1 }}>{n.label}</span>
            {st!=="idle" && <span style={{ width:6, height:6, borderRadius:"50%", background:dotColor,
              animation:st==="running"?"spin 1.5s ease-in-out infinite":"none" }} />}
          </button>
        );
      })}
      {/* Footer */}
      <div style={{ marginTop:"auto", padding:"24px", borderTop:"1px solid #1E293B" }}>
        <div style={{ fontSize:11, color:"#475569", fontWeight:600 }}>Kavindya T A S</div>
        <div style={{ fontSize:10, color:"#334155", marginTop:2 }}>IT22150820 · 25-26J-145-DS</div>
      </div>
    </nav>
  );
}

// ── Overview page ─────────────────────────────────────────────────────────────
function OverviewPage({ expState, trainState, setPage }:
  { expState:ExpState; trainState:TrainState; setPage:(p:string)=>void }) {
  const res = trainState.results;
  const sum = res?.summary;
  const tr  = res?.training;

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:T.ink, margin:0 }}>Research Dashboard</h1>
        <p style={{ fontSize:14, color:T.ink3, marginTop:4 }}>Cheese brochure decision-making · Brand, Familiarity, Price influence analysis</p>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <Stat label="Participants" value={expState.participant_count||"—"} sub="enrolled" />
        <Stat label="Decisions"    value={sum?.total_decisions??"—"} sub="brochures analyzed" />
        <Stat label="Model CV Acc" value={tr ? tr.cv_accuracy*100+"%" : "—"} color={T.fam} sub={tr?`±${(tr.cv_std*100).toFixed(1)}% std`:"not trained"} />
        <Stat label="Avg RT"       value={sum?.avg_reaction_time!=null?sum.avg_reaction_time+"s":"—"} sub="reaction time" />
      </div>

      {/* Pipeline */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:T.ink, marginBottom:20 }}>Pipeline status</div>
          {[
            { label:"Run PsychoPy experiment",   done: expState.status==="complete",   active: expState.status==="running" },
            { label:"Train model",                done: trainState.status==="complete", active: trainState.status==="running" },
            { label:"View results",               done: !!res,                          active: false },
          ].map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:i<2?18:0 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%", flexShrink:0,
                background: s.done ? T.fam : s.active ? T.brand : T.canvas,
                border: `2px solid ${s.done ? T.fam : s.active ? T.brand : T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:700,
                color: s.done||s.active ? "#fff" : T.ink3,
              }}>{s.done?"✓":i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:s.done?T.ink:s.active?T.brand:T.ink3 }}>{s.label}</div>
                {i<2 && <div style={{ height:4, background:T.canvas, borderRadius:99, marginTop:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:99, transition:"width 0.6s",
                    background: s.done?T.fam:s.active?T.brand:T.border,
                    width: s.done?"100%":s.active?"55%":"0%" }} />
                </div>}
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:T.ink, marginBottom:16 }}>Quick start</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <PrimaryBtn onClick={()=>setPage("experiment")}>▶  Launch experiment</PrimaryBtn>
            <GhostBtn   onClick={()=>setPage("training")}>Train model</GhostBtn>
            {res && <GhostBtn onClick={()=>setPage("results")}>View results →</GhostBtn>}
          </div>
          {res && (
            <>
              <div style={{ borderTop:`1px solid ${T.border}`, margin:"18px 0" }} />
              <div style={{ fontSize:12, color:T.ink3, marginBottom:10, fontWeight:600 }}>Last run — overall influence</div>
              <TriBar b={sum!.avg_brand_pct} f={sum!.avg_familiarity_pct} p={sum!.avg_price_pct} />
            </>
          )}
        </Card>
      </div>

      {/* If results exist show mini breakdown */}
      {res && (
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:T.ink, marginBottom:16 }}>Decision count by dominant reason</div>
          <div style={{ display:"flex", gap:14 }}>
            {Object.entries(sum!.reason_counts).map(([r,c]) => (
              <div key={r} style={{ flex:1, background:RL[r]||T.canvas, border:`1px solid ${RC[r]||T.border}33`,
                borderRadius:12, padding:"16px 20px", textAlign:"center" }}>
                <div style={{ fontSize:30, fontWeight:800, color:RC[r]||T.ink }}>{c}</div>
                <div style={{ fontSize:12, color:T.ink3, marginTop:4, fontWeight:600 }}>{r}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Experiment page ───────────────────────────────────────────────────────────
function ExperimentPage({ expState, setExpState, setPage }:
  { expState:ExpState; setExpState:React.Dispatch<React.SetStateAction<ExpState>>; setPage:(p:string)=>void }) {
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string|null>(null);
  const [participants, setParticipants] = useState(1);

  async function launch() {
    setLoading(true); setError(null);
    try {
      const r = await post("/experiment/launch");
      if (r.error) setError(r.error);
      else setExpState(s=>({...s,status:"running"}));
    } catch { setError("Cannot reach Flask backend. Is app.py running on port 5000?"); }
    finally { setLoading(false); }
  }

  async function complete() {
    const r = await post("/experiment/complete",{participant_count:participants});
    setExpState(s=>({...s,...r}));
  }

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:T.ink, margin:0 }}>Run Experiment</h1>
        <p style={{ fontSize:14, color:T.ink3, marginTop:4 }}>Launch PsychoPy and record participant decisions across 5 brochures</p>
      </div>

      {/* Status hero */}
      <Card style={{ textAlign:"center", marginBottom:20, background:`linear-gradient(135deg,${T.canvas} 0%,#EFF6FF 100%)` }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🧪</div>
        <div style={{ fontSize:20, fontWeight:800, color:T.ink, marginBottom:8 }}>Cheese Brochure Decision Experiment</div>
        <div style={{ fontSize:14, color:T.ink3, maxWidth:500, margin:"0 auto 20px", lineHeight:1.7 }}>
          Participants view 5 product brochures and click their preferred item.
          Mouse position and reaction time are recorded per brochure automatically.
        </div>

        {/* Status badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:T.card,
          border:`1px solid ${T.border}`, borderRadius:99, padding:"8px 18px", marginBottom:20 }}>
          <Dot status={expState.status} />
          <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>
            {{ idle:"Ready to launch", running:"Experiment running in PsychoPy…", complete:"Session complete ✓" }[expState.status]}
          </span>
        </div>

        {error && (
          <div style={{ background:T.priceLt, color:T.priceDk, borderRadius:10, padding:"12px 16px", fontSize:13, marginBottom:16, maxWidth:500, margin:"0 auto 16px" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          {expState.status !== "complete" && (
            <PrimaryBtn onClick={launch} disabled={loading||expState.status==="running"}>
              {loading?"Opening…":expState.status==="running"?"Running in PsychoPy…":"▶  Open in PsychoPy"}
            </PrimaryBtn>
          )}
          {expState.status === "running" && (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <label style={{ fontSize:13, color:T.ink3, fontWeight:600 }}>Participants:</label>
              <input type="number" value={participants} min={1}
                onChange={e=>setParticipants(Number(e.target.value))}
                style={{ width:70, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.border}`,
                  fontSize:13, fontFamily:"inherit", color:T.ink }} />
              <GhostBtn onClick={complete}>Mark complete →</GhostBtn>
            </div>
          )}
          {expState.status === "complete" && (
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, color:T.fam, fontWeight:700, fontSize:14 }}>✓ Session saved</div>
              <PrimaryBtn onClick={()=>setPage("training")}>Go to training →</PrimaryBtn>
            </div>
          )}
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Steps */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:T.ink, marginBottom:18 }}>How it works</div>
          {([
            ["Open in PsychoPy",       "Flask calls os.startfile() on Cheese.psyexp — PsychoPy opens automatically with the experiment loaded."],
            ["Run with participant",    "Participant views all 5 brochures and clicks their choice. PsychoPy records everything."],
            ["Enter count & complete",  "Enter how many participants ran this session, then click Mark complete."],
            ["Proceed to training",     "The experiment data is ready — go to Train Model to run predictions."],
          ] as [string,string][]).map(([h,d],i) => (
            <div key={i} style={{ display:"flex", gap:14, marginBottom:i<3?16:0 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:T.brandLt, color:T.brand,
                fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:3 }}>{h}</div>
                <div style={{ fontSize:12, color:T.ink3, lineHeight:1.6 }}>{d}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Data recorded */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:T.ink, marginBottom:16 }}>Data recorded per brochure</div>
          {([
            ["Reaction time (mouse.time)", "Used as model feature", true],
            ["Gaze X position (mouse.x)",  "Used as model feature", true],
            ["Gaze Y position (mouse.y)",  "Used as model feature", true],
            ["Clicked item name",          "Metadata only — not a model input", false],
          ] as [string,string,boolean][]).map(([label,note,used]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{label}</div>
                <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{note}</div>
              </div>
              <Pill label={used?"Feature":"Metadata"} color={used?T.famDk:T.ink3} bg={used?T.famLt:"#F1F5F9"} />
            </div>
          ))}
          <div style={{ marginTop:14, padding:"12px 14px", background:T.canvas, borderRadius:10, fontSize:12, color:T.ink3, lineHeight:1.6 }}>
            💡 <strong>Note:</strong> clicked_item is stored for your reference but intentionally excluded from the model to avoid data leakage.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Training page ─────────────────────────────────────────────────────────────
function TrainingPage({ expState, trainState, setTrainState, setPage }:
  { expState:ExpState; trainState:TrainState; setTrainState:React.Dispatch<React.SetStateAction<TrainState>>; setPage:(p:string)=>void }) {
  const logRef     = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const [age,    setAge]    = useState<number>(23);
  const [gender, setGender] = useState<string>("Female");

  const poll = useCallback(async () => {
    const data: TrainState = await get("/training/status");
    setTrainState(data);
    if (data.status==="complete"||data.status==="error") {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [setTrainState]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [trainState.log]);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  async function start() {
    if (expState.status !== "complete") { alert("Complete the experiment session first."); return; }
    setTrainState(s => ({ ...s, status:"running", log:[], results:null }));
    await post("/training/start", { age, gender });
    pollingRef.current = setInterval(poll, 800);
  }

  const tr = trainState.results?.training;

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:T.ink, margin:0 }}>Train Model</h1>
        <p style={{ fontSize:14, color:T.ink3, marginTop:4 }}>Random Forest on behavioral signals — Brand / Familiarity / Price classification</p>
      </div>

      {/* Control card */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <Dot status={trainState.status} />
              <span style={{ fontWeight:700, fontSize:16, color:T.ink }}>
                {{ idle:"Ready to train", running:"Training…", complete:"Training complete", error:"Error — see log" }[trainState.status]}
              </span>
            </div>
            <div style={{ fontSize:13, color:T.ink3 }}>
              Runs behavior_model.py directly — no notebooks, no nbconvert issues
            </div>
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            {trainState.status !== "complete" && (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:T.ink3 }}>AGE</label>
                  <input type="number" value={age} min={1}
                    onChange={e=>setAge(Number(e.target.value))}
                    style={{ width:72, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.border}`,
                      fontSize:14, fontFamily:"inherit", color:T.ink, fontWeight:600 }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:T.ink3 }}>GENDER</label>
                  <select value={gender} onChange={e=>setGender(e.target.value)}
                    style={{ padding:"8px 12px", borderRadius:8, border:`1.5px solid ${T.border}`,
                      fontSize:14, fontFamily:"inherit", color:T.ink, background:"#fff" }}>
                    <option>Female</option><option>Male</option>
                  </select>
                </div>
                <div style={{ paddingTop:18 }}>
                  <PrimaryBtn onClick={start} disabled={trainState.status==="running"||expState.status!=="complete"}>
                    {trainState.status==="running"?"Training…":"Run pipeline"}
                  </PrimaryBtn>
                </div>
              </>
            )}
            {trainState.status === "complete" && (
              <PrimaryBtn onClick={()=>setPage("results")}>View results →</PrimaryBtn>
            )}
          </div>
        </div>

        {/* Accuracy badges when done */}
        {tr && (
          <div style={{ display:"flex", gap:12, marginTop:18, paddingTop:18, borderTop:`1px solid ${T.border}` }}>
            <div style={{ background:T.famLt, border:`1px solid ${T.fam}33`, borderRadius:10, padding:"10px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.famDk, textTransform:"uppercase", letterSpacing:"0.05em" }}>CV Accuracy</div>
              <div style={{ fontSize:22, fontWeight:800, color:T.fam }}>{(tr.cv_accuracy*100).toFixed(1)}%</div>
              <div style={{ fontSize:11, color:T.ink3 }}>±{(tr.cv_std*100).toFixed(1)}% std</div>
            </div>
            <div style={{ background:T.brandLt, border:`1px solid ${T.brand}33`, borderRadius:10, padding:"10px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.brandDk, textTransform:"uppercase", letterSpacing:"0.05em" }}>Test Accuracy</div>
              <div style={{ fontSize:22, fontWeight:800, color:T.brand }}>{(tr.test_accuracy*100).toFixed(1)}%</div>
              <div style={{ fontSize:11, color:T.ink3 }}>held-out 20%</div>
            </div>
          </div>
        )}
      </Card>

      {/* Log */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:14, color:T.ink, marginBottom:12 }}>Live output</div>
        <div ref={logRef} style={{
          background:"#0D1117", color:"#7EE787", fontFamily:"'Consolas','Courier New',monospace",
          fontSize:12, padding:"16px", borderRadius:10,
          minHeight:160, maxHeight:260, overflowY:"auto", lineHeight:1.8,
        }}>
          {trainState.log.length
            ? trainState.log.map((l,i) => <div key={i} style={{ color: l.startsWith("ERROR") ? "#FF7B72" : l.startsWith(">>") ? "#79C0FF" : "#7EE787" }}>{l}</div>)
            : <div style={{ color:"#30363D" }}>Waiting for pipeline to start…</div>}
        </div>
      </Card>

      {/* Config */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card>
          <div style={{ fontWeight:700, fontSize:14, color:T.ink, marginBottom:14 }}>Pipeline steps</div>
          {([
            ["Load training data",   "synthetic_dataset_with_item.csv (switches to real data once ≥10 labeled rows exist)"],
            ["5-fold CV",            "Stratified cross-validation gives a reliable accuracy estimate"],
            ["Train Random Forest",  "300 trees, max_depth=8, class_weight=balanced"],
            ["Convert PsychoPy CSV", "Extracts reaction_time, gaze_x/y per brochure from latest CSV"],
            ["Predict percentages",  "Outputs Brand%, Familiarity%, Price% per brochure"],
            ["Write results JSON",   "latest_results.json is read immediately by the frontend"],
          ] as [string,string][]).map(([h,d],i) => (
            <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontWeight:700, color:T.brand, fontSize:13, minWidth:18 }}>{i+1}.</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{h}</div>
                <div style={{ fontSize:11, color:T.ink3, lineHeight:1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontWeight:700, fontSize:14, color:T.ink, marginBottom:14 }}>Model configuration</div>
          {([
            ["Algorithm",    "Random Forest Classifier"],
            ["Estimators",   "300 trees"],
            ["Max depth",    "8"],
            ["Class weight", "balanced (handles imbalanced classes)"],
            ["Features",     "age, reaction_time, gaze_x, gaze_y, gender, brochure_id"],
            ["Target",       "Brand | Familiarity | Price"],
            ["Validation",   "5-fold stratified CV + 80/20 hold-out"],
            ["Key fix",      "brochure_id is one-hot encoded; clicked_item removed"],
          ] as [string,string][]).map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}`, fontSize:13, gap:16 }}>
              <span style={{ color:T.ink3, fontWeight:600, flexShrink:0 }}>{k}</span>
              <span style={{ color:T.ink, textAlign:"right" }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── Results page ──────────────────────────────────────────────────────────────
function ResultsPage({ results }: { results: Results|null }) {
  if (!results) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", color:T.ink3 }}>
      <div style={{ fontSize:56, marginBottom:16 }}>📊</div>
      <div style={{ fontWeight:700, fontSize:18, color:T.ink, marginBottom:8 }}>No results yet</div>
      <div style={{ fontSize:14, textAlign:"center" }}>Run the experiment and train the model to see per-brochure influence percentages here.</div>
    </div>
  );

  const { predictions, training: tr, summary: sum } = results;

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:T.ink, margin:0 }}>Results</h1>
        <p style={{ fontSize:14, color:T.ink3, marginTop:4 }}>
          Brand · Familiarity · Price influence per decision &nbsp;·&nbsp;
          Model accuracy: <strong style={{ color:T.fam }}>{(tr.cv_accuracy*100).toFixed(1)}%</strong> CV
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <Stat label="Decisions"      value={sum.total_decisions} sub="brochures analyzed" />
        <Stat label="Avg Brand"      value={sum.avg_brand_pct+"%"}       color={T.brand} sub="avg influence" />
        <Stat label="Avg Familiarity" value={sum.avg_familiarity_pct+"%"} color={T.fam}   sub="avg influence" />
        <Stat label="Avg Price"      value={sum.avg_price_pct+"%"}       color={T.price}  sub="avg influence" />
      </div>

      {/* Overall bar */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:T.ink }}>Overall influence across all decisions</div>
            <div style={{ fontSize:13, color:T.ink3, marginTop:3 }}>Average % each factor contributed across all {sum.total_decisions} brochure decisions</div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {Object.entries(sum.reason_counts).map(([r,c])=>(
              <div key={r} style={{ textAlign:"center", padding:"8px 14px", borderRadius:10, background:RL[r]||T.canvas, border:`1px solid ${RC[r]||T.border}33` }}>
                <div style={{ fontSize:20, fontWeight:800, color:RC[r]||T.ink }}>{c}</div>
                <div style={{ fontSize:10, color:T.ink3, fontWeight:600 }}>{r}</div>
              </div>
            ))}
          </div>
        </div>
        <TriBar b={sum.avg_brand_pct} f={sum.avg_familiarity_pct} p={sum.avg_price_pct} height={18} />
      </Card>

      {/* Per-brochure grid */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:16, color:T.ink, marginBottom:14 }}>Per-brochure breakdown</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
          {predictions.map((p,i) => {
            const col  = RC[p.predicted_reason]||T.ink;
            const colL = RL[p.predicted_reason]||T.canvas;
            return (
              <div key={i} style={{ background:T.card, border:`1px solid ${T.border}`,
                borderRadius:14, padding:"18px 20px", borderTop:`4px solid ${col}` }}>
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:T.ink }}>Brochure {p.brochure_id}</div>
                    <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>
                      {p.clicked_item}
                      {p.reaction_time!=null && <span style={{ marginLeft:8, color:T.ink3 }}>· {p.reaction_time}s</span>}
                    </div>
                  </div>
                  <Pill label={p.predicted_reason} color={col} bg={colL} />
                </div>

                {/* Tri bar */}
                <TriBar b={p.brand_pct} f={p.familiarity_pct} p={p.price_pct} />

                {/* Pct row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:14 }}>
                  {[
                    {l:"Brand",       v:p.brand_pct,       c:T.brand, bg:T.brandLt},
                    {l:"Familiarity", v:p.familiarity_pct, c:T.fam,   bg:T.famLt},
                    {l:"Price",       v:p.price_pct,       c:T.price, bg:T.priceLt},
                  ].map(s=>(
                    <div key={s.l} style={{ background:s.bg, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:17, fontWeight:800, color:s.c }}>{s.v.toFixed(1)}%</div>
                      <div style={{ fontSize:10, color:T.ink3, fontWeight:600, marginTop:2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${T.border}`, fontSize:11, color:T.ink3 }}>
                  Age {p.age} · {p.gender}
                  {p.gaze_x!=null && <span> · Gaze ({p.gaze_x.toFixed(3)}, {p.gaze_y?.toFixed(3)})</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw table */}
      <Card>
        <div style={{ fontWeight:700, fontSize:15, color:T.ink, marginBottom:16 }}>Raw data table</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:T.canvas }}>
                {["Brochure","Clicked item","RT (s)","Brand %","Familiarity %","Price %","Decision"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:T.ink3,
                    fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em",
                    borderBottom:`2px solid ${T.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {predictions.map((p,i)=>(
                <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.card:T.canvas }}>
                  <td style={{ padding:"10px 14px", fontWeight:700 }}>{p.brochure_id}</td>
                  <td style={{ padding:"10px 14px", color:T.ink3 }}>{p.clicked_item}</td>
                  <td style={{ padding:"10px 14px" }}>{p.reaction_time??"—"}</td>
                  <td style={{ padding:"10px 14px", color:T.brand, fontWeight:700 }}>{p.brand_pct}%</td>
                  <td style={{ padding:"10px 14px", color:T.fam,   fontWeight:700 }}>{p.familiarity_pct}%</td>
                  <td style={{ padding:"10px 14px", color:T.price, fontWeight:700 }}>{p.price_pct}%</td>
                  <td style={{ padding:"10px 14px" }}>
                    <Pill label={p.predicted_reason} color={RC[p.predicted_reason]||T.ink} bg={RL[p.predicted_reason]||T.canvas} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,       setPage]       = useState<string>("overview");
  const [expState,   setExpState]   = useState<ExpState>({ status:"idle", participant_count:0 });
  const [trainState, setTrainState] = useState<TrainState>({ status:"idle", log:[], results:null });

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.canvas, fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{ box-sizing:border-box; margin:0; padding:0; }
        body{ background:${T.canvas}; }
        button:active{ transform:scale(0.97); }
        @keyframes spin{ 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar{ width:6px; height:6px; }
        ::-webkit-scrollbar-track{ background:transparent; }
        ::-webkit-scrollbar-thumb{ background:${T.border}; border-radius:99px; }
        input:focus,select:focus{ outline:2px solid ${T.brand}; outline-offset:1px; }
      `}</style>

      <Sidebar page={page} setPage={setPage} expState={expState} trainState={trainState} />

      <main style={{ flex:1, overflowY:"auto", padding:"40px 48px", maxWidth:1100 }}>
        {page==="overview"   && <OverviewPage   expState={expState} trainState={trainState} setPage={setPage} />}
        {page==="experiment" && <ExperimentPage expState={expState} setExpState={setExpState} setPage={setPage} />}
        {page==="training"   && <TrainingPage   expState={expState} trainState={trainState} setTrainState={setTrainState} setPage={setPage} />}
        {page==="results"    && <ResultsPage    results={trainState.results} />}
      </main>
    </div>
  );
}
