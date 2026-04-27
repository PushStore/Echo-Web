// ─── THEME (Thread dark mode — always dark as default) ──────────────────────
export const C = {
  bg: "#000", bgSecondary: "#1a1a1a", surface: "#0f0f0f", card: "#111", border: "#2a2a2a",
  accent: "#6ee7b7", gradient: "linear-gradient(90deg, #059669, #6ee7b7)",
  accentDark: "#059669",
  text: "#e7e9ea", muted: "#71767b",
  danger: "#f4212e", green: "#00ba7c", blue: "#1d9bf0",
};

export const fmt = n =>
  n >= 1e6 ? (n/1e6).toFixed(1)+"M" :
  n >= 1000 ? (n/1000).toFixed(1)+"K" :
  String(n||0);

// ─── ICONS ────────────────────────────────────────────────────────────────────
export const IcoHome     = ({on}) => <svg width="26" height="26" viewBox="0 0 24 24" fill={on?C.text:"none"} stroke={on?C.text:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
export const IcoVideo    = ({on}) => <svg width="26" height="26" viewBox="0 0 24 24" fill={on?C.text:"none"} stroke={on?C.text:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
export const IcoSearch   = ({on,color}) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color||(on?C.text:C.muted)} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
export const IcoMail     = ({on}) => <svg width="26" height="26" viewBox="0 0 24 24" fill={on?C.text:"none"} stroke={on?C.text:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
export const IcoBell     = ({on}) => <svg width="26" height="26" viewBox="0 0 24 24" fill={on?C.text:"none"} stroke={on?C.text:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
export const IcoHeart    = ({on,color=C.danger,size=20}) => <svg width={size} height={size} viewBox="0 0 24 24" fill={on?color:"none"} stroke={on?color:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
export const IcoRetweet  = ({on}) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?C.green:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
export const IcoComment  = ({color=C.muted,size=20}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
export const IcoShare    = ({color=C.muted,size=20}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
export const IcoBookmark = ({on}) => <svg width="20" height="20" viewBox="0 0 24 24" fill={on?C.accent:"none"} stroke={on?C.accent:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>;
export const IcoEye      = ({color=C.muted,size=18}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
export const IcoThumbUp  = ({on,color=C.danger,size=20}) => <svg width={size} height={size} viewBox="0 0 24 24" fill={on?color:"none"} stroke={on?color:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>;
export const IcoThumbDown= ({on,color=C.blue,size=20}) => <svg width={size} height={size} viewBox="0 0 24 24" fill={on?color:"none"} stroke={on?color:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/></svg>;
export const IcoBar      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
export const IcoPlus     = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
export const IcoProfile  = ({on}) => <svg width="24" height="24" viewBox="0 0 24 24" fill={on?C.text:"none"} stroke={on?C.text:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
export const IcoSettings = ({on}) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on?C.text:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;

// ─── SHARED BUTTON ────────────────────────────────────────────────────────────
export const Btn = ({icon, count, color, onClick}) => (
  <button
    onClick={onClick}
    style={{
      background:"none", border:"none", cursor:"pointer",
      display:"flex", alignItems:"center", gap:5,
      color:color||C.muted, fontSize:13, padding:"3px 0",
      WebkitTapHighlightColor:"transparent",
    }}
  >
    {icon}
    {count !== undefined && <span style={{color}}>{fmt(count)}</span>}
  </button>
);
