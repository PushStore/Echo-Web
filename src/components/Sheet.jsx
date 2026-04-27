import { useEffect } from "react";
import { C } from "../theme.js";

// ── Sheet wrapper — registers with App's modal stack for back button ──────────
export default function Sheet({ show, onClose, onModalOpen, onModalClose, title, showClose, children }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (show) {
      onModalOpen?.(onClose);
      return () => onModalClose?.();
    }
  }, [show]);
  if (!show) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.65)" }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position:"fixed", left:0, right:0, bottom:0, zIndex:101,
        background:C.card, borderRadius:"20px 20px 0 0",
        padding:"0 24px", paddingBottom:"max(32px,env(safe-area-inset-bottom))",
        maxHeight:"90vh", overflowY:"auto",
      }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:C.border }}/>
        </div>
        {title && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"0 0 20px" }}>
            <h3 style={{ color:C.text, fontWeight:800, fontSize:18, margin:0 }}>{title}</h3>
            {showClose && (
              <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
