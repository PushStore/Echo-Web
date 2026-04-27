import { useState, useRef, useEffect } from "react";
import { C } from "../theme.js";
import EchoLogo from "../components/EchoLogo.jsx";
import { p2pBridge, activateWebBridge, autoActivateWebBridge } from "../p2p-bridge.js";
import StorageSelectionScreen from "./StorageSelectionScreen.jsx";
import motherShip from "../mothership.js";

// ── Password helpers (stored locally in localStorage — never sent anywhere) ──
const PASS_KEY = "echo_local_pin";
const hashPassword = async (pw) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + "__echo_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};
const savePassword = async (pw) => localStorage.setItem(PASS_KEY, await hashPassword(pw));
const checkPassword = async (pw) => {
  const stored = localStorage.getItem(PASS_KEY);
  if (!stored) return false;
  return stored === await hashPassword(pw);
};
const hasPassword   = ()   => !!localStorage.getItem(PASS_KEY);

// ── Eye icon for show/hide password ──────────────────────────────────────────
const IcoEye = ({ show }) => show
  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>;

// ── Auth input — defined OUTSIDE to prevent keyboard-dismiss bug ──────────────
const AuthInput = ({ label, inputRef, type = "text", autoComplete, right }) => (
  <div style={{ marginBottom:16, position:"relative" }}>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"22px 44px 8px 14px", position:"relative" }}>
      <span style={{ position:"absolute", top:8, left:14, color:C.muted, fontSize:12 }}>{label}</span>
      <input
        ref={inputRef} type={type}
        autoComplete={autoComplete || "off"} autoCorrect="off"
        autoCapitalize="none" spellCheck={false}
        style={{ width:"100%", background:"none", border:"none", outline:"none", color:C.text, fontSize:17, padding:0, boxSizing:"border-box" }}
      />
    </div>
    {right && (
      <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)" }}>
        {right}
      </div>
    )}
  </div>
);

export default function AuthScreen({ onLogin }) {
  const [mode,     setMode]     = useState("landing");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [nodeUrl, setNodeUrl]   = useState("");
  const [nodeStatus, setNodeStatus] = useState(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const nameRef   = useRef(null);
  const handleRef = useRef(null);
  const passRef   = useRef(null);
  const passRef2  = useRef(null);
  const nodeRef   = useRef(null);

  // On mount: check for existing keypair — auto-login if found
  // If password is set, go to locked screen instead
  useEffect(() => {
    const check = async () => {
      // Auto-activate web bridge if there's persisted state
      await autoActivateWebBridge();

      try {
        const result = await p2pBridge.getMyProfile();
        if (result.exists) {
          if (hasPassword()) {
            setMode("locked");
          } else {
            onLogin({ name:result.name, handle:result.handle, avatar:result.avatar, banner:result.banner||null, userId:result.userId });
          }
        }
      } catch(_) {}
      // Restore saved node URL
      const saved = localStorage.getItem("echo_node_url") || localStorage.getItem("echo_web_node_url");
      if (saved) setNodeUrl(saved);
      // Check existing connection
      try {
        const s = await p2pBridge.getEchoNodeStatus?.();
        if (s?.connected) setNodeStatus(s);
      } catch(_) {}
      setChecking(false);
    };
    check();
  }, []);

  // ── Android hardware back button handler ─────────────────────────────────
  // The App.js back button handler only runs AFTER login, so AuthScreen
  // needs its own listener for signup/locked/nodesetup pages.
  useEffect(() => {
    let removeListener = null;
    const setup = async () => {
      try {
        const { App: CapApp } = await import("../capacitor-app-shim.js");
        const listener = await CapApp.addListener("backButton", () => {
          setMode(prevMode => {
            if (prevMode === "signup" || prevMode === "nodesetup" || prevMode === "storage") {
              return "landing";
            }
            if (prevMode === "locked") {
              // On locked screen: minimize app (don't exit)
              CapApp.getMinimizeApp && CapApp.getMinimizeApp();
              return prevMode;
            }
            // On landing page: exit app
            CapApp.exitApp();
            return prevMode;
          });
          setError("");
        });
        removeListener = () => listener.remove();
      } catch (_) {
        // Not on native platform — ignore
      }
    };
    setup();
    return () => { if (removeListener) removeListener(); };
  }, []);

  const doConnectNode = async () => {
    let url = (nodeRef.current?.value.trim() || nodeUrl.trim()).replace(/\s+/g, "");
    if (!url) { setError("Enter your Echo Node address."); return; }
    // Auto-prepend http:// if no protocol specified — user just enters IP:port
    if (!/^https?:\/\//i.test(url)) {
      url = "http://" + url;
    }
    setNodeLoading(true); setError("");
    try {
      // Activate web bridge on web platform
      await activateWebBridge();
      const result = await p2pBridge.connectToEchoNode({ url });
      if (result.connected) {
        setNodeStatus(result);
        setNodeUrl(url);
        localStorage.setItem("echo_node_url", url);
      } else {
        setError("Could not connect. Make sure Echo Node is running.");
      }
    } catch(e) {
      setError("Node connection failed: " + (e.message || "Unknown error"));
    }
    setNodeLoading(false);
  };

  const doCreate = async () => {
    const name   = nameRef.current?.value.trim() || "";
    const handle = handleRef.current?.value.trim().replace(/[@\s]/g, "") || "";
    const pass   = passRef.current?.value  || "";
    const pass2  = passRef2.current?.value || "";
    if (!name)             { setError("Please enter your name."); return; }
    if (handle.length < 3) { setError("Username must be at least 3 characters."); return; }
    const handleRegex = /^[a-z0-9_]{3,32}$/;
    if (!handleRegex.test(handle)) {
      setError("Username must be 3-32 characters (lowercase letters, numbers, underscores).");
      return;
    }
    if (pass.length > 0 && pass.length < 4) { setError("Password must be at least 4 characters (or leave blank)."); return; }
    if (pass !== pass2)    { setError("Passwords don't match."); return; }
    setError(""); setLoading(true);
    try {
      // Activate web bridge on web platform so signup goes to real node
      await activateWebBridge();

      const avail = await p2pBridge.checkHandleAvailable({ handle });
      if (!avail.available) { setError(`@${handle} is already taken.`); setLoading(false); return; }
      const result = await p2pBridge.setupProfile({ name, handle });
      if (result.success) {
        if (pass.length > 0) await savePassword(pass);
        setPendingUser({ name, handle, avatar:null, banner:null, userId:result.userId });
        setMode("storage");
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch(e) {
      const msg = e.message || "unknown";
      if (msg.startsWith("handle_taken:"))        setError(msg.replace("handle_taken:", ""));
      else if (msg.startsWith("node_error:")) setError(msg.replace("node_error:", ""));
      else setError("Could not create account: " + msg);
    }
    setLoading(false);
  };

  const doSignIn = async () => {
    setError(""); setLoading(true);
    try {
      // Activate web bridge on web platform
      await activateWebBridge();
      const result = await p2pBridge.getMyProfile();
      if (result.exists) {
        onLogin({ name:result.name, handle:result.handle, avatar:result.avatar, banner:result.banner||null, userId:result.userId });
      } else {
        setError("No account found on this device. Create one first.");
      }
    } catch(e) { setError("Could not sign in."); }
    setLoading(false);
  };

  const doUnlock = async () => {
    const pass = passRef.current?.value || "";
    if (!pass) { setError("Enter your password."); return; }
    if (!await checkPassword(pass)) { setError("Wrong password."); return; }
    setError(""); setLoading(true);
    try {
      const result = await p2pBridge.getMyProfile();
      if (result.exists) {
        onLogin({ name:result.name, handle:result.handle, avatar:result.avatar, banner:result.banner||null, userId:result.userId });
      }
    } catch(e) { setError("Could not sign in."); }
    setLoading(false);
  };

  /**
   * Auto-connect to Echo Node via Mother Ship.
   * Used when user clicks "Connect Automatically" — no manual IP needed.
   */
  const doAutoConnect = async () => {
    setError(""); setNodeLoading(true);
    try {
      // Activate web bridge first
      await activateWebBridge();

      // Try to get saved node URL first
      const savedUrl = localStorage.getItem("echo_web_node_url");
      if (savedUrl) {
        console.log("[Auth] Found saved node URL, reconnecting:", savedUrl);
        const result = await p2pBridge.connectToEchoNode({ url: savedUrl });
        if (result.connected) {
          setNodeStatus(result);
          setNodeUrl(savedUrl);
          setNodeLoading(false);
          return;
        }
        console.warn("[Auth] Saved node unreachable, trying Mother Ship…");
      }

      // Connect to Mother Ship and request a nearby node
      console.log("[Auth] Requesting node from Mother Ship…");
      const msResult = await motherShip.connect("web_auto");
      console.log("[Auth] Mother Ship result:", msResult);

      if (msResult.connected) {
        // Wait a moment for connection to stabilize
        await new Promise(r => setTimeout(r, 1000));

        // Request nearby node
        const nodeResult = await motherShip.requestNode();
        console.log("[Auth] Node assignment:", nodeResult);

        if (nodeResult.success && nodeResult.nodeUrl) {
          const nodeUrl = nodeResult.nodeUrl;
          console.log("[Auth] Connecting to assigned node:", nodeUrl);
          const connectResult = await p2pBridge.connectToEchoNode({ url: nodeUrl });
          if (connectResult.connected) {
            setNodeStatus(connectResult);
            setNodeUrl(nodeUrl);
            localStorage.setItem("echo_node_url", nodeUrl);
            setNodeLoading(false);
            return;
          }
        }
      }

      setError("Could not auto-connect. Mother Ship may be unavailable. Try manual node setup below.");
    } catch(e) {
      console.error("[Auth] Auto-connect error:", e);
      setError("Auto-connect failed: " + (e.message || "Unknown error") + ". Try manual setup.");
    }
    setNodeLoading(false);
  };

  const Back = () => (
    <button onClick={() => { setMode("landing"); setError(""); }}
      style={{ background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:24, alignSelf:"flex-start", WebkitTapHighlightColor:"transparent" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
    </button>
  );

  const LogoBlock = ({ small }) => (
    <div style={{ display:"flex", justifyContent:"center", marginBottom: small ? 16 : 0 }}>
      <EchoLogo
        size={small ? 56 : 100}
        style={{ borderRadius: small ? 12 : 20, boxShadow:`0 0 ${small ? 24 : 48}px rgba(110,231,183,0.2)` }}
      />
    </div>
  );

  const eyeBtn = (ref) => (
    <button
      onMouseDown={e => { e.preventDefault(); setShowPass(s => !s); }}
      style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}
    >
      <IcoEye show={showPass}/>
    </button>
  );

  // ── Storage selection (post-signup) ───────────────────────────────────
  if (mode === "storage" && pendingUser) return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100dvh", background:C.bg }}>
      <StorageSelectionScreen
        onComplete={(storageType) => {
          onLogin(pendingUser);
        }}
        onBack={() => {
          // If coming from signup, allow skip with P2P as default
          onLogin(pendingUser);
        }}
        showContinue={true}
        currentStorage="p2p"
        p2p={p2pBridge}
      />
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (checking) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, flexDirection:"column", gap:16 }}>
      <EchoLogo size={48}/><span style={{ color:C.muted, fontSize:14 }}>Loading…</span>
    </div>
  );

  // ── Lock screen (has account + password set) ───────────────────────────────
  if (mode === "locked") return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"60px 28px 48px", background:C.bg }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <LogoBlock small={false}/>
        <span style={{ color:C.text, fontSize:28, fontWeight:900, letterSpacing:-1 }}>Echo</span>
        <span style={{ color:C.muted, fontSize:14 }}>Enter your password to continue</span>
      </div>
      <div style={{ width:"100%" }}>
        <AuthInput
          label="Password"
          inputRef={passRef}
          type={showPass ? "text" : "password"}
          autoComplete="current-password"
          right={eyeBtn(passRef)}
        />
        {error && <p style={{ color:C.danger, fontSize:13, margin:"-8px 0 12px" }}>{error}</p>}
        <button onClick={doUnlock} disabled={loading} style={{
          width:"100%", border:"none", borderRadius:28, padding:"15px 0",
          background:`linear-gradient(90deg,${C.accentDark},${C.accent})`,
          color:"#000", fontWeight:800, fontSize:16, cursor:"pointer",
          opacity:loading?0.6:1, WebkitTapHighlightColor:"transparent",
          boxShadow:`0 4px 20px rgba(110,231,183,0.25)`,
        }}>{loading ? "Unlocking…" : "Unlock"}</button>
      </div>
    </div>
  );

  // ── Landing ────────────────────────────────────────────────────────────────
  if (mode === "landing") return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"60px 28px 48px", background:C.bg }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <LogoBlock small={false}/>
        <span style={{ color:C.text, fontSize:32, fontWeight:900, letterSpacing:-1.5, marginTop:8 }}>echo</span>
        <span style={{ color:C.muted, fontSize:14, textAlign:"center", maxWidth:260, lineHeight:1.6 }}>
          Your Voice,Your Echo, peer to peer.<br/>No Servers. No Surveillance. No Ads.
        </span>
      </div>
      <div style={{ width:"100%" }}>
        <button onClick={() => setMode("signup")} style={{
          width:"100%", border:"none", borderRadius:28, padding:"15px 0",
          background:`linear-gradient(90deg,${C.accentDark},${C.accent})`,
          color:"#000", fontWeight:800, fontSize:16, cursor:"pointer", marginBottom:12,
          boxShadow:`0 6px 24px rgba(110,231,183,0.3)`, WebkitTapHighlightColor:"transparent",
        }}>Create account</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ flex:1, height:1, background:C.border }}/><span style={{ color:C.muted, fontSize:14 }}>or</span><div style={{ flex:1, height:1, background:C.border }}/>
        </div>
        <button onClick={doSignIn} disabled={loading} style={{
          width:"100%", background:"none", border:`1px solid ${C.border}`,
          borderRadius:28, padding:"15px 0", color:C.text, fontWeight:700, fontSize:16,
          cursor:"pointer", opacity:loading?0.6:1, WebkitTapHighlightColor:"transparent",
        }}>
          {loading ? "Checking…" : "Sign in on this device"}
        </button>
        {error && <p style={{ color:C.danger, fontSize:13, textAlign:"center", marginTop:10 }}>{error}</p>}
        <p style={{ color:C.muted, fontSize:11, textAlign:"center", marginTop:20, lineHeight:1.7 }}>
          Your identity is a cryptographic key.<br/>No email or password — ever.
        </p>
        {/* Connect To Echo Node — auto or manual */}
        <button onClick={() => setMode("nodesetup")} style={{
          width:"100%", background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:12, padding:"12px 16px", color:C.text, fontWeight:600, fontSize:14,
          cursor:"pointer", marginTop:16, display:"flex", alignItems:"center", gap:10,
          WebkitTapHighlightColor:"transparent",
        }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: nodeStatus?.connected ? C.green : C.muted }} />
          <span>{nodeStatus?.connected ? `Node: ${nodeUrl}` : "Connect To Echo Node"}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" style={{ marginLeft:"auto" }}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );

  // ── Node Setup ─────────────────────────────────────────────────────────────
  if (mode === "nodesetup") return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"28px 28px", background:C.bg, overflowY:"auto" }}>
      <Back/>
      <LogoBlock small={true}/>
      <h2 style={{ color:C.text, fontSize:26, fontWeight:900, margin:"0 0 6px", textAlign:"center" }}>Connect To Echo Node</h2>
      <p style={{ color:C.muted, fontSize:13, margin:"0 0 20px", textAlign:"center", lineHeight:1.5 }}>
        Web → Echo Mother Ship → Echo Node<br/>Your node is automatically assigned.
      </p>

      {/* Auto-connect button */}
      <button onClick={doAutoConnect} disabled={nodeLoading} style={{
        width:"100%", border:"none", borderRadius:28, padding:"15px 0", marginBottom:20,
        background:`linear-gradient(90deg,${C.accentDark},${C.accent})`,
        color:"#000", fontWeight:800, fontSize:16, cursor:"pointer",
        opacity:nodeLoading?0.6:1, WebkitTapHighlightColor:"transparent",
        boxShadow:`0 4px 20px rgba(110,231,183,0.25)`,
      }}>
        {nodeLoading ? "Connecting via Mother Ship…" : "⚡ Connect Automatically"}
      </button>

      {nodeStatus?.connected && (
        <div style={{ marginTop:-12, marginBottom:20, padding:14, background:C.surface, borderRadius:12, border:`1px solid ${C.green}`, textAlign:"center" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.green }} />
            <span style={{ color:C.green, fontSize:14, fontWeight:700 }}>Connected</span>
          </div>
          <span style={{ color:C.muted, fontSize:12 }}>{nodeUrl}</span>
        </div>
      )}

      {/* Manual node URL divider */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ flex:1, height:1, background:C.border }}/><span style={{ color:C.muted, fontSize:13 }}>or enter node address manually</span><div style={{ flex:1, height:1, background:C.border }}/>
      </div>

      <AuthInput label="Node address (e.g. 192.168.1.100)" inputRef={nodeRef} />
      {error && <p style={{ color:C.danger, fontSize:13, margin:"-8px 0 12px" }}>{error}</p>}
      <button onClick={doConnectNode} disabled={nodeLoading} style={{
        width:"100%", border:"none", borderRadius:28, padding:"15px 0", marginTop:8,
        background:C.surface, border:`1px solid ${C.border}`,
        color:C.text, fontWeight:700, fontSize:16, cursor:"pointer",
        opacity:nodeLoading?0.6:1, WebkitTapHighlightColor:"transparent",
      }}>{nodeLoading ? "Connecting…" : "Connect Manually"}</button>

      <button onClick={() => setMode("landing")} style={{
        background:"none", border:"none", cursor:"pointer", color:C.accent,
        fontSize:14, marginTop:24, textAlign:"center", WebkitTapHighlightColor:"transparent",
      }}>
        <strong>Back to login</strong>
      </button>
    </div>
  );

  // ── Signup form ────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"28px 28px", background:C.bg, overflowY:"auto" }}>
      <Back/>
      <LogoBlock small={true}/>
      <h2 style={{ color:C.text, fontSize:26, fontWeight:900, margin:"0 0 6px", textAlign:"center" }}>Create your account</h2>
      <p style={{ color:C.muted, fontSize:13, margin:"0 0 28px", textAlign:"center", lineHeight:1.5 }}>
        Your keypair is generated on this device.<br/>No server ever sees your password.
      </p>
      <AuthInput label="Your name"                 inputRef={nameRef}   autoComplete="name"/>
      <AuthInput label="Username (unique on Echo)" inputRef={handleRef} autoComplete="username"/>
      <AuthInput
        label="Password (optional — protects this device)"
        inputRef={passRef}
        type={showPass ? "text" : "password"}
        autoComplete="new-password"
        right={eyeBtn(passRef)}
      />
      <AuthInput
        label="Confirm password"
        inputRef={passRef2}
        type={showPass ? "text" : "password"}
        autoComplete="new-password"
      />
      {error && <p style={{ color:C.danger, fontSize:13, margin:"-8px 0 12px" }}>{error}</p>}
      <button onClick={doCreate} disabled={loading} style={{
        width:"100%", border:"none", borderRadius:28, padding:"15px 0", marginTop:8,
        background:`linear-gradient(90deg,${C.accentDark},${C.accent})`,
        color:"#000", fontWeight:800, fontSize:16, cursor:"pointer",
        opacity:loading?0.6:1, WebkitTapHighlightColor:"transparent",
        boxShadow:`0 4px 20px rgba(110,231,183,0.25)`,
      }}>{loading ? "Creating account…" : "Create account"}</button>
      <div style={{ marginTop:24, padding:16, background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
        <p style={{ color:C.muted, fontSize:12, margin:0, lineHeight:1.8 }}>
          <strong style={{ color:C.text }}>📱 Device account</strong><br/>
          Your private key lives in this phone's secure enclave and never leaves it.
          Password (if set) is stored only on this device — never sent anywhere.<br/>
          <span style={{ color:C.accent }}>Export a QR backup from profile settings to move to a new phone.</span>
        </p>
      </div>
      <button onClick={() => setMode("landing")} style={{
        background:"none", border:"none", cursor:"pointer", color:C.accent,
        fontSize:14, marginTop:20, textAlign:"center", WebkitTapHighlightColor:"transparent",
      }}>
        Already have an account? <strong>Sign in</strong>
      </button>
    </div>
  );
}
