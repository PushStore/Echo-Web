import { C } from "../../theme.js";
import Sheet from "../../components/Sheet.jsx";
import EchoNodeSettings from "../../components/EchoNodeSettings.jsx";

// ── Settings Sheet ─────────────────────────────────────────────────────────
export default function SettingsSheet({ show, onClose, p2p, onModalOpen, onModalClose, onOpenEdit, onOpenAccount }) {
  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose} title="Settings">
      {/* Edit profile — moved to top of settings */}
      <button onClick={() => { onClose(); onOpenEdit(); }}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <div style={{ textAlign:"left" }}>
          <div style={{ color:C.text, fontSize:16 }}>Edit profile</div>
          <div style={{ color:C.muted, fontSize:12 }}>Name, bio, avatar, banner</div>
        </div>
      </button>
      {/* Account settings */}
      <button onClick={() => { onClose(); onOpenAccount(); }}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <div style={{ textAlign:"left" }}>
          <div style={{ color:C.text, fontSize:16 }}>Account settings</div>
          <div style={{ color:C.muted, fontSize:12 }}>Log out, delete account</div>
        </div>
      </button>
      {/* Backup & Restore */}
      <button onClick={onClose}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <div style={{ textAlign:"left" }}>
          <div style={{ color:C.text, fontSize:16 }}>Backup & Restore</div>
          <div style={{ color:C.muted, fontSize:12 }}>Export and import your data</div>
        </div>
      </button>
      {/* Device Management */}
      <button onClick={onClose}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        <div style={{ textAlign:"left" }}>
          <div style={{ color:C.text, fontSize:16 }}>Device Management</div>
          <div style={{ color:C.muted, fontSize:12 }}>Manage linked devices</div>
        </div>
      </button>
      {/* Identity Verification */}
      <button onClick={onClose}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div style={{ textAlign:"left" }}>
          <div style={{ color:C.text, fontSize:16 }}>Identity Verification</div>
          <div style={{ color:C.muted, fontSize:12 }}>Verify your identity for trust</div>
        </div>
      </button>
      {/* ── Echo Node Relay ── */}
      <div style={{ borderTop:`1px solid ${C.border}`, marginTop:4, paddingTop:4 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:"0.5px", padding:"12px 0 4px" }}>ECHO NODE</div>
        <EchoNodeSettings p2p={p2p} />
      </div>

      {/* Switch account — placeholder until multi-account is built */}
      <button onClick={onClose}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <div style={{ textAlign:"left" }}>
          <div style={{ color:C.muted, fontSize:16 }}>Switch account</div>
          <div style={{ color:C.muted, fontSize:12 }}>Coming soon — multi-account support</div>
        </div>
      </button>
      <button onClick={onClose} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 0", color:C.muted, fontSize:16, textAlign:"left" }}>Cancel</button>
    </Sheet>
  );
}
