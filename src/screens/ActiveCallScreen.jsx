// File: src/screens/ActiveCallScreen.jsx
import { useState, useEffect, useRef } from "react";
import { C } from "../theme.js";

export default function ActiveCallScreen({ call, p2p, onEnd }) {
  const [duration,  setDuration]  = useState(0);
  const [muted,    setMuted]    = useState(false);
  const [speaker,  setSpeaker]  = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const durationRef = useRef(null);

  // ── Duration timer ─────────────────────────────────────────────────────
  useEffect(() => {
    durationRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, []);

  // ── Format duration ────────────────────────────────────────────────────
  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ── End call ───────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (p2p && call?.callId) {
      try { await p2p.callEnd?.({ callId: call.callId }); } catch (e) {
        console.error("[ActiveCall] end failed:", e);
      }
    }
    if (durationRef.current) clearInterval(durationRef.current);
    onEnd?.();
  };

  const peerName = call?.peer?.displayName || call?.peer?.name || call?.peerName || "Unknown";
  const isVideo = call?.callType === "video" || showVideo;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(180deg, #000 0%, #0a0a0a 50%, #0f0f0f 100%)",
      position: "relative", padding: 40,
    }}>

      {/* Video area (if video call) */}
      {isVideo && (
        <div style={{
          position: "absolute", inset: 0, background: "#0a0a0a",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* Placeholder for remote video */}
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #064e3b, #111, #1e1b4b)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#000", fontSize: 40, fontWeight: 800 }}>
                {peerName[0]?.toUpperCase()}
              </span>
            </div>
          </div>
          {/* Self-view PIP */}
          <div style={{
            position: "absolute", top: 60, right: 16,
            width: 100, height: 140, borderRadius: 14,
            background: C.surface, border: `2px solid ${C.border}`,
            overflow: "hidden",
          }}>
            <div style={{
              width: "100%", height: "100%",
              background: C.surface, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: C.muted, fontSize: 12 }}>Camera off</span>
            </div>
          </div>
        </div>
      )}

      {/* Caller info */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center",
        ...(isVideo ? { position: "absolute", top: 40, left: 0, right: 0 } : {}),
      }}>
        {/* Avatar (audio call only) */}
        {!isVideo && (
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
            boxShadow: "0 0 40px rgba(110,231,183,0.2)",
          }}>
            <span style={{ color: "#000", fontSize: 40, fontWeight: 800 }}>
              {peerName[0]?.toUpperCase()}
            </span>
          </div>
        )}

        <div style={{
          fontWeight: 800, color: "#fff", fontSize: 24, marginBottom: 6,
          textShadow: isVideo ? "0 2px 8px rgba(0,0,0,.8)" : "none",
        }}>
          {peerName}
        </div>

        {/* Call type badge */}
        <div style={{
          background: "rgba(255,255,255,.1)", borderRadius: 20,
          padding: "4px 12px", marginBottom: 12,
        }}>
          <span style={{ color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600 }}>
            {isVideo ? "📹 Video Call" : "📞 Audio Call"}
          </span>
        </div>

        {/* Duration */}
        <div style={{
          color: "rgba(255,255,255,.6)", fontSize: 18, fontWeight: 300,
          fontVariantNumeric: "tabular-nums",
          textShadow: isVideo ? "0 2px 8px rgba(0,0,0,.8)" : "none",
        }}>
          {fmt(duration)}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        position: "absolute", bottom: "max(40px, env(safe-area-inset-bottom))",
        left: 0, right: 0, zIndex: 2,
        display: "flex", justifyContent: "center", gap: 20, padding: "0 24px",
      }}>
        {/* Mute */}
        <button onClick={() => setMuted(m => !m)} style={{
          width: 56, height: 56, borderRadius: "50%",
          background: muted ? C.danger : "rgba(255,255,255,.15)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {muted ? (
              <>
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.48-.34 2.16"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </>
            )}
          </svg>
        </button>

        {/* Speaker */}
        <button onClick={() => setSpeaker(s => !s)} style={{
          width: 56, height: 56, borderRadius: "50%",
          background: speaker ? C.accent : "rgba(255,255,255,.15)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {speaker ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 010 7.07"/>
                <path d="M19.07 4.93a10 10 0 010 14.14"/>
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </>
            )}
          </svg>
        </button>

        {/* Video toggle (for audio calls) */}
        {!isVideo && (
          <button onClick={() => setShowVideo(v => !v)} style={{
            width: 56, height: 56, borderRadius: "50%",
            background: showVideo ? C.accent : "rgba(255,255,255,.15)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </button>
        )}

        {/* End call */}
        <button onClick={handleEnd} style={{
          width: 64, height: 64, borderRadius: "50%",
          background: C.danger, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(244,33,46,0.4)",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 003.41 2.6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
