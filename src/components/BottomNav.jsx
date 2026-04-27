import { C, IcoHome, IcoVideo, IcoSearch, IcoMail, IcoBell } from "../theme.js";

// ── New icons for Phase 5 tabs ────────────────────────────────────────────────
const IcoGroups = ({on}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? C.text : "none"} stroke={on ? C.text : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const IcoPhone = ({on}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? C.text : "none"} stroke={on ? C.text : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const TABS = [
  { id:"home",          Icon:IcoHome   },
  { id:"videos",        Icon:IcoVideo  },
  { id:"search",        Icon:IcoSearch },
  { id:"inbox",         Icon:IcoMail   },
  { id:"groups",        Icon:IcoGroups },
  { id:"calls",         Icon:IcoPhone  },
  { id:"notifications", Icon:IcoBell   },
];

export default function BottomNav({ active, setActive, show }) {
  return (
    <div style={{
      display:"flex", background:C.bg,
      borderTop:`1px solid ${C.border}`,
      paddingBottom:"max(6px, env(safe-area-inset-bottom))",
      transform: show ? "translateY(0)" : "translateY(100%)",
      transition:"transform 0.25s ease",
      flexShrink:0,
    }}>
      {TABS.map(({ id, Icon }) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          style={{
            flex:1, background:"none", border:"none", cursor:"pointer",
            padding:"8px 0 3px", display:"flex", flexDirection:"column",
            alignItems:"center", gap:0, position:"relative",
            WebkitTapHighlightColor:"transparent",
          }}
        >
          <div style={{opacity: active===id ? 1 : 0.4, transition:"opacity .15s"}}>
            <Icon on={active===id}/>
          </div>
          {active===id && (
            <div style={{width:4,height:4,borderRadius:"50%",background:C.accent,marginTop:2}}/>
          )}
        </button>
      ))}
    </div>
  );
}
