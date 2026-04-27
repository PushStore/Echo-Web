import { useState } from "react";
import { C } from "../theme.js";

// ── Connection status dot (pulse animation on disconnect) ─────────────────────
export function ConnectionDot({ connected, onClick }) {
  const [pulse, setPulse] = useState(false);
  const color = connected ? "#00ba7c" : "#f4212e";
  if (!connected) setPulse(true);
  return (
    <button onClick={onClick} style={{
      background:"none", border:"none", cursor:"pointer", padding:6,
      position:"relative", WebkitTapHighlightColor:"transparent",
    }} aria-label="Connection status">
      <div style={{
        width:10, height:10, borderRadius:"50%", background:color,
        boxShadow: `0 0 ${pulse ? 12 : 6}px ${color}`,
        transition: "box-shadow 0.3s ease",
      }}/>
    </button>
  );
}
