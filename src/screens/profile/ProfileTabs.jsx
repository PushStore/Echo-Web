import { C } from "../../theme.js";

// ── Profile Tabs: Posts / Media / Likes / Bookmarks ──
const TABS = [
  { id:"posts",     label:"Posts"     },
  { id:"media",     label:"Media"     },
  { id:"likes",     label:"Likes"     },
  { id:"bookmarks", label:"Bookmarks" },
];

export default function ProfileTabs({ activeTab, onTabChange, counts }) {
  return (
    <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginTop:16 }}>
      {TABS.map(({ id, label }) => (
        <button key={id} onClick={() => onTabChange(id)} style={{
          flex:1, background:"none", border:"none", cursor:"pointer",
          padding:"12px 4px 10px", color:activeTab===id ? C.text : C.muted,
          fontWeight:activeTab===id ? 700 : 400, fontSize:12,
          position:"relative", WebkitTapHighlightColor:"transparent",
        }}>
          <div>{label}</div>
          <div style={{ color: activeTab===id ? C.accent : C.muted, fontSize:11, fontWeight:600 }}>
            {counts[id] ?? 0}
          </div>
          {activeTab===id && (
            <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:28, height:3, background:C.accent, borderRadius:2 }}/>
          )}
        </button>
      ))}
    </div>
  );
}
