const { useState, useRef, useEffect } = React;

/* ─── Config ──────────────────────────────────────────── */
const ADMIN_EMAIL    = "emmanuelabamiyo26@gmail.com";
const ADMIN_PASSWORD = "Itoteh26@";
const GEMINI_MODEL   = "gemini-1.5-flash";

const C = {
  bg:"#07090f", surface:"#0d1117", card:"#111827", border:"#1f2937",
  accent:"#00c9a7", violet:"#7c3aed", blue:"#3b82f6",
  text:"#f1f5f9", muted:"#64748b",
  success:"#22c55e", danger:"#ef4444", warn:"#f59e0b",
};

/* ─── Storage ─────────────────────────────────────────── */
const LS = {
  get:(k)=>{ try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null} },
  set:(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v))}catch{} },
  del:(k)=>{ try{localStorage.removeItem(k)}catch{} },
};
const SS = {
  get:(k)=>{ try{const v=sessionStorage.getItem(k);return v?JSON.parse(v):null}catch{return null} },
  set:(k,v)=>{ try{sessionStorage.setItem(k,JSON.stringify(v))}catch{} },
  del:(k)=>{ try{sessionStorage.removeItem(k)}catch{} },
};

function getUsers() {
  const u = LS.get('et_users') || [];
  if (!u.length) {
    const seed = [{ id:1, name:"Demo User", email:"demo@emma.tech", password:"Demo1234", createdAt:new Date().toISOString() }];
    LS.set('et_users', seed);
    return seed;
  }
  return u;
}

/* ─── Google Gemini AI helper (FIXED v1 ENDPOINT) ───────── */
async function ai(messages, systemPrompt, jsonMode = false) {
  const key = LS.get('et_gemini_key');
  if (!key) return "⚠️ No API key set. Go to Admin → API Settings to add your free Google AI key.";

  const contents = [];
  for (const m of messages) {
    const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
    if (contents.length && contents[contents.length-1].role === role) {
      contents[contents.length-1].parts[0].text += "\n" + m.content;
    } else {
      contents.push({ role, parts:[{ text: m.content }] });
    }
  }

  const STABLE_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  if (jsonMode) {
    body.generationConfig.responseMimeType = "application/json";
    if (body.contents.length > 0 && body.contents[body.contents.length - 1].parts[0]) {
      body.contents[body.contents.length - 1].parts[0].text += "\n\nCRITICAL: Return raw JSON only. Do not wrap inside markdown code blocks.";
    }
  }

  try {
    const r = await fetch(`${STABLE_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.error) throw new Error(`${d.error.status}: ${d.error.message}`);
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch(e) {
    return `Error: ${e.message}`;
  }
}

/* ─── UI Primitives ───────────────────────────────────── */
function Spinner() {
  return (
    <span style={{display:"inline-flex",gap:4,alignItems:"center"}}>
      {[0,1,2].map(i=>(
        <span key={i} style={{width:7,height:7,borderRadius:"50%",background:C.accent,animation:`et-pulse 1.1s ${i*.18}s ease-in-out infinite`}}/>
      ))}
    </span>
  );
}

function Btn({children,onClick,disabled,variant="primary",small,full,style:sx={}}) {
  const v={
    primary:{background:C.accent,color:"#000"},
    ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},
    violet:{background:C.violet,color:"#fff"},
    blue:{background:C.blue,color:"#fff"},
    danger:{background:C.danger,color:"#fff"},
  };
  return(
    <button onClick={!disabled?onClick:undefined} style={{border:"none",borderRadius:8,padding:small?"0.4rem 0.9rem":"0.7rem 1.4rem",fontWeight:600,fontSize:small?"0.8rem":"0.9rem",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.45:1,transition:"all .15s",display:"inline-flex",alignItems:"center",gap:6,width:full?"100%":undefined,justifyContent:full?"center":undefined,...v[variant],...sx}}>
      {children}
    </button>
  );
}

function Field({label,type="text",value,onChange,placeholder,onKeyDown,hint,mono}) {
  const [foc,setFoc]=useState(false);
  return(
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:"block",color:C.muted,fontSize:"0.72rem",letterSpacing:2,marginBottom:7,fontWeight:600}}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        style={{width:"100%",background:C.bg,border:`1px solid ${foc?C.accent:C.border}`,borderRadius:8,padding:"0.7rem 0.9rem",color:C.text,outline:"none",boxSizing:"border-box",fontSize:"0.9rem",transition:"border-color .15s",fontFamily:mono?"monospace":"inherit"}}/>
      {hint&&<div style={{color:C.muted,fontSize:"0.72rem",marginTop:5,lineHeight:1.5}}>{hint}</div>}
    </div>
  );
}

function Card({children,style:sx={},onClick,onMouseEnter,onMouseLeave}) {
  return(
    <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.25rem 1.5rem",...sx}}>
      {children}
    </div>
  );
}

function Loading({msg}) {
  return(
    <Card style={{textAlign:"center",padding:"3rem"}}>
      <Spinner/>
      <p style={{color:C.muted,marginTop:16,fontSize:"0.9rem"}}>{msg||"Gemini AI is thinking..."}</p>
    </Card>
  );
}

function NavItem({label,icon,active,onClick}) {
  return(
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:10,padding:"0.65rem 1.25rem",cursor:"pointer",color:active?C.accent:C.muted,background:active?`${C.accent}14`:"transparent",borderRight:`2px solid ${active?C.accent:"transparent"}`,fontWeight:active?600:400,fontSize:"0.875rem",transition:"all .15s"}}>
      <span style={{fontSize:"1rem",width:18,textAlign:"center"}}>{icon}</span>{label}
    </div>
  );
}

/* ─── Setup Screen ────────────────────────────────────── */
/* (Includes all remaining application UI components) */
function SetupScreen({onDone}) {
  const [key,setKey]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const activate = async()=>{
    if (!key.trim()) return setErr("Please paste your API key.");
    if (!key.trim().startsWith("AIza")) return setErr('Google AI keys start with "AIza...".');
    setLoading(true); setErr("");
    LS.set('et_gemini_key', key.trim());
    const test = await ai([{role:"user",content:"Reply with exactly the word: OK"}], null);
    setLoading(false);
    if (test.startsWith("Error")) { LS.del('et_gemini_key'); setErr(`Key test failed: ${test}`); }
    else onDone();
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{width:"100%",maxWidth:500}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"2.4rem",letterSpacing:"-1px",background:`linear-gradient(130deg,${C.accent},#60a5fa,${C.violet})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Emma Tech</div>
          <div style={{color:C.muted,fontSize:"0.7rem",letterSpacing:5,marginTop:4}}>AI STUDY PLATFORM</div>
        </div>
        <Card style={{padding:"2rem"}}>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:"2rem",marginBottom:8}}>🔑</div>
            <h2 style={{color:C.text,fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",marginBottom:6}}>Connect Free AI</h2>
            <p style={{color:C.muted,fontSize:"0.82rem",lineHeight:1.7}}>Emma Tech runs on <strong style={{color:C.text}}>Google Gemini</strong> — completely free.</p>
          </div>
          <Field label="GOOGLE AI API KEY" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="AIzaSy..." onKeyDown={e=>e.key==="Enter"&&activate()} mono/>
          {err&&<div style={{color:C.danger,fontSize:"0.82rem",marginBottom:14,padding:"0.6rem 0.8rem",background:`${C.danger}18`,borderRadius:8,border:`1px solid ${C.danger}33`}}>{err}</div>}
          <Btn onClick={activate} disabled={loading||!key.trim()} full>{loading?<><Spinner/> Testing...</>:"Activate Emma Tech →"}</Btn>
        </Card>
      </div>
    </div>
  );
}

function AuthScreen({onLogin}) {
  const [tab,setTab]=useState("login");
  const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [pass,setPass]=useState(""); const [conf,setConf]=useState("");
  const [err,setErr]=useState("");

  const doLogin=()=>{
    setErr(""); if (!email||!pass) return setErr("Please fill in all fields.");
    const users=getUsers();
    const found=users.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.password===pass);
    if (!found) return setErr("Incorrect email or password.");
    SS.set('et_session',found); onLogin(found);
  };

  const doRegister=()=>{
    setErr(""); if (!name.trim()||!email||!pass||!conf) return setErr("Please fill in all fields.");
    if (pass!==conf) return setErr("Passwords do not match.");
    const users=getUsers();
    if (users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return setErr("Account already exists.");
    const nu={id:Date.now(),name:name.trim(),email:email.toLowerCase(),password:pass,createdAt:new Date().toISOString()};
    LS.set('et_users',[...users,nu]); SS.set('et_session',nu); onLogin(nu);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <Card style={{padding:"2rem"}}>
          <div style={{display:"flex",background:C.bg,borderRadius:10,padding:4,marginBottom:24,gap:4}}>
            {["login","register"].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setErr("");}} style={{flex:1,padding:"0.5rem",borderRadius:7,border:"none",background:tab===t?C.card:"transparent",color:tab===t?C.text:C.muted,fontWeight:600,cursor:"pointer"}}>
                {t==="login"?"Sign In":"Register"}
              </button>
            ))}
          </div>
          {tab==="register"&&<Field label="FULL NAME" value={name} onChange={e=>setName(e.target.value)}/>}
          <Field label="EMAIL" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <Field label="PASSWORD" type="password" value={pass} onChange={e=>setPass(e.target.value)}/>
          {tab==="register"&&<Field label="CONFIRM" type="password" value={conf} onChange={e=>setConf(e.target.value)}/>}
          {err&&<div style={{color:C.danger,fontSize:"0.82rem",marginBottom:14}}>{err}</div>}
          <Btn onClick={tab==="login"?doLogin:doRegister} full>{tab==="login"?"Sign In":"Create Account"}</Btn>
        </Card>
      </div>
    </div>
  );
}

function App() {
  const [user,setUser]=useState(()=>SS.get('et_session'));
  const [setup,setSetup]=useState(!LS.get('et_gemini_key'));
  const [view,setView]=useState("home");
  const [mat,setMat]=useState(""); const [topic,setTopic]=useState("");

  const [ssMsg,setSSMsg]=useState([]); const [ssIn,setSSIn]=useState(""); const [ssLoad,setSSLoad]=useState(false);
  const [testQs,setTestQs]=useState([]); const [testLoad,setTestLoad]=useState(false);
  const [testAns,setTestAns]=useState({}); const [testDone,setTestDone]=useState(false); const [testScore,setTestScore]=useState(0);
  const [cards,setCards]=useState([]); const [cardLoad,setCardLoad]=useState(false); const [ci,setCi]=useState(0); const [cf,setCf]=useState(false);
  const [guide,setGuide]=useState(""); const [guideLoad,setGuideLoad]=useState(false);

  const [adminIn,setAdminIn]=useState(false);
  const [aEmail,setAEmail]=useState(""); const [aPass,setAPass]=useState(""); const [aErr,setAErr]=useState("");
  const [newKey,setNewKey]=useState(""); const [keySaved,setKeySaved]=useState(false); const [keyTesting,setKeyTesting]=useState(false); const [keyErr,setKeyErr]=useState("");

  const hasMat=mat.trim().length>30;

  if (setup) return <SetupScreen onDone={()=>setSetup(false)}/>;
  if (!user) return <AuthScreen onLogin={setUser}/>;

  const startSS=async()=>{
    if(!hasMat) return; setSSMsg([]); setSSLoad(true); setView("smartStudy");
    const text=await ai([{role:"user",content:`Material:\n"${mat.slice(0,2000)}"\n\nAsk one adaptive question.`}],"Emma Tech tutor.");
    setSSMsg([{role:"ai",text}]); setSSLoad(false);
  };

  const sendSS=async()=>{
    if(!ssIn.trim()||ssLoad) return;
    const msg=ssIn.trim(); setSSIn("");
    const next=[...ssMsg,{role:"user",text:msg}]; setSSMsg(next); setSSLoad(true);
    const hist=[...next.map(m=>({role:m.role==="ai"?"model":"user",content:m.text}))];
    const text=await ai(hist,"Emma Tech Socratic tutor evaluation.");
    setSSMsg([...next,{role:"ai",text}]); setSSLoad(false);
  };

  const genTest=async()=>{
    if(!hasMat) return; setTestLoad(true); setTestQs([]); setTestAns({}); setTestDone(false); setView("test");
    const raw=await ai([{role:"user",content:`Material:\n"${mat.slice(0,2000)}"\n\n8 MCQs JSON format array ONLY:`}],"JSON Array generator.",true);
    try{ setTestQs(JSON.parse(raw.replace(/```json|```/g,"").trim())); }catch{ setTestQs([]); }
    setTestLoad(false);
  };

  const genCards=async()=>{
    if(!hasMat) return; setCardLoad(true); setCards([]); setCi(0); setCf(false); setView("flashcards");
    const raw=await ai([{role:"user",content:`Material:\n"${mat.slice(0,2000)}"\n\n10 flashcards array JSON:`}],"JSON Array generator.",true);
    try{ setCards(JSON.parse(raw.replace(/```json|```/g,"").trim())); }catch{ setCards([]); }
    setCardLoad(false);
  };

  const genGuide=async()=>{
    if(!hasMat) return; setGuideLoad(true); setGuide(""); setView("studyGuide");
    const text=await ai([{role:"user",content:`Guide sections:\n"${mat.slice(0,2000)}"`}],"Emma Tech study guide generator.");
    setGuide(text); setGuideLoad(false);
  };

  const adminLogin=()=>{
    if(aEmail.trim()===ADMIN_EMAIL&&aPass===ADMIN_PASSWORD) setAdminIn(true);
    else setAErr("Invalid credentials.");
  };

  const saveKey=async()=>{
    if(!newKey.trim()||!newKey.trim().startsWith("AIza")) return;
    setKeyTesting(true); LS.set('et_gemini_key',newKey.trim());
    const r=await ai([{role:"user",content:"OK"}],null);
    setKeyTesting(false);
    if(r.startsWith("Error")) { LS.del('et_gemini_key'); setKeyErr(r); } else setKeySaved(true);
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg}}>
      {/* Navigation Sidebar */}
      <div style={{width:230,background:C.surface,borderRight:`1px solid ${C.border}`,padding:"1rem"}}>
        <h3 style={{fontFamily:"'Syne'",color:C.accent,marginBottom:20}}>Emma Tech</h3>
        {[{id:"home",l:"Home"},{id:"upload",l:"Upload"},{id:"smartStudy",l:"Smart Study"},{id:"test",l:"Test"},{id:"flashcards",l:"Flashcards"},{id:"studyGuide",l:"Guide"},{id:"admin",l:"Admin"}].map(n=>(
          <NavItem key={n.id} label={n.l} active={view===n.id} onClick={()=>setView(n.id)}/>
        ))}
      </div>
      {/* View router workspace */}
      <div style={{flex:1,padding:"2rem",maxWidth:800}}>
        {view==="home"&&(
          <Card>
            <h2>Welcome to Emma Tech, {user.name}</h2>
            <p style={{color:C.muted,marginTop:10}}>Select an app on the left layout sidebar to start utilizing adaptive Google Gemini study methods seamlessly.</p>
            <Btn style={{marginTop:15}} onClick={()=>setView("upload")}>Upload material →</Btn>
          </Card>
        )}
        {view==="upload"&&(
          <Card>
            <h3>Paste Materials</h3>
            <textarea value={mat} onChange={e=>setMat(e.target.value)} rows={10} style={{width:"100%",background:C.bg,color:"#fff",padding:10,marginTop:10}} placeholder="Paste text here..."/>
            <div style={{marginTop:10,display:"flex",gap:10}}>
              <Btn small disabled={!hasMat} onClick={startSS}>Socratic study</Btn>
              <Btn small disabled={!hasMat} onClick={genTest}>Generate Quiz</Btn>
            </div>
          </Card>
        )}
        {view==="smartStudy"&&<Card><h3>Smart Session</h3>{ssLoad?<Spinner/>:<div>{ssMsg.map((m,i)=><p key={i}><b>{m.role}:</b> {m.text}</p>)}<input value={ssIn} onChange={e=>setSSIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendSS()} style={{width:"100%",padding:8,marginTop:10}}/></div>}</Card>}
        {view==="test"&&<Card><h3>Exam Quiz</h3>{testLoad?<Spinner/>:<div>{testQs.map((q,i)=><div key={i}><p>{q.q}</p></div>)}</div>}</Card>}
        {view==="flashcards"&&<Card><h3>Flash Memory</h3>{cardLoad?<Spinner/>:<div><p>{cards[ci]?.term}</p><Btn small onClick={()=>setCf(!cf)}>{cf?cards[ci]?.definition:"Flip"}</Btn></div>}</Card>}
        {view==="studyGuide"&&<Card><h3>Guide</h3>{guideLoad?<Spinner/>:<pre style={{whiteSpace:"pre-wrap"}}>{guide}</pre>}</Card>}
        {view==="admin"&&(!adminIn?<div><Field label="Admin Email" value={aEmail} onChange={e=>setAEmail(e.target.value)}/><Field label="Password" type="password" value={aPass} onChange={e=>setAPass(e.target.value)}/><Btn onClick={adminLogin}>Login</Btn></div>:<Card><h3>Update API Config</h3><input type="password" value={newKey} onChange={e=>setNewKey(e.target.value)}/><Btn onClick={saveKey}>Save Configuration</Btn></Card>)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
