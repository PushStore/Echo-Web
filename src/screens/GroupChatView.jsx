// File: src/screens/GroupChatView.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../theme.js";

// Color palette for sender names (deterministic by userId)
const SENDER_COLORS = ["#6ee7b7","#60a5fa","#f472b6","#fbbf24","#a78bfa","#fb923c","#34d399","#e879f9","#38bdf8","#f87171"];
const getSenderColor = (userId) => {
  let hash = 0;
  for (let i = 0; i < (userId || "").length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

function MessageBubble({ msg, isMine }) {
  const senderColor = getSenderColor(msg.senderId);
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isMine ? "flex-end" : "flex-start",
      marginBottom: 10, paddingHorizontal: 14,
    }}>
      {/* Sender name (not for own messages) */}
      {!isMine && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%", background: senderColor,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "#000", fontSize: 11, fontWeight: 800 }}>
              {(msg.senderName || "?")[0]?.toUpperCase()}
            </span>
          </div>
          <span style={{ color: senderColor, fontSize: 12, fontWeight: 600 }}>{msg.senderName || "Unknown"}</span>
        </div>
      )}
      {/* Image message */}
      {msg.type === "image" && msg.mediaUrl && (
        <img src={msg.mediaUrl} alt="" style={{
          maxWidth: 220, borderRadius: 14, marginBottom: 2,
          ...(isMine ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 }),
        }}/>
      )}
      {/* Video message */}
      {msg.type === "video" && msg.mediaUrl && (
        <video src={msg.mediaUrl} controls style={{
          maxWidth: 220, borderRadius: 14, marginBottom: 2,
          ...(isMine ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 }),
        }}/>
      )}
      {/* Text bubble */}
      {msg.text && (
        <div style={{
          background: isMine ? `linear-gradient(135deg,${C.accentDark},${C.accent})` : C.surface,
          color: isMine ? "#000" : C.text,
          borderRadius: 14,
          padding: "10px 14px",
          fontSize: 15, lineHeight: 1.45,
          maxWidth: "80%",
          ...(isMine ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 }),
          border: isMine ? "none" : `1px solid ${C.border}`,
        }}>
          {msg.text}
        </div>
      )}
      {/* Timestamp */}
      <span style={{ color: C.muted, fontSize: 10, marginTop: 2, paddingHorizontal: 4 }}>
        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
      </span>
    </div>
  );
}

export default function GroupChatView({ group, onBack, p2p, me }) {
  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [showInfo,  setShowInfo]  = useState(false);

  const scrollRef = useRef(null);
  const pollRef   = useRef(null);

  // ── Load messages ──────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!p2p || !group?.groupId) return;
    try {
      const r = await p2p.groupGetMessages?.({ groupId: group.groupId }).catch(() => ({ messages: [] }));
      setMessages(r.messages || r || []);
    } catch (e) {
      console.error("[GroupChat] loadMessages failed:", e);
    }
    if (loading) setLoading(false);
  }, [p2p, group?.groupId, loading]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  // ── Auto-scroll to bottom ──────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !p2p) return;
    setText("");
    try {
      await p2p.groupSendMessage?.({ groupId: group.groupId, text: trimmed });
      await loadMessages();
    } catch (e) {
      console.error("[GroupChat] send failed:", e);
      setText(trimmed);
    }
  };

  // ── Leave group ────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (!p2p || !window.confirm("Leave this group?")) return;
    try {
      await p2p.groupLeave?.({ groupId: group.groupId });
    } catch (e) {
      console.error("[GroupChat] leave failed:", e);
    }
    onBack();
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,.92)", backdropFilter: "blur(14px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.text,
          fontSize: 22, cursor: "pointer", padding: "0 4px",
        }}>←</button>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#000", fontSize: 16, fontWeight: 800 }}>
            {(group.name || "G")[0]?.toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{group.name}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>{group.memberCount || 0} members</div>
        </div>
        <button onClick={() => setShowInfo(!showInfo)} style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", padding: 8, borderRadius: 8,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Group info panel */}
      {showInfo && (
        <div style={{
          background: C.card, padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          {group.description && <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>{group.description}</div>}
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Created by {group.creatorName || "Unknown"}</div>
          <button onClick={handleLeave} style={{
            background: "none", border: `1px solid ${C.danger}`, borderRadius: 20,
            padding: "8px 16px", color: C.danger, fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            Leave Group
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {loading && messages.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: C.muted }}>Loading messages…</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: C.muted }}>No messages yet. Say hello!</div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} msg={msg} isMine={msg.senderId === me?.userId} />
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        borderTop: `1px solid ${C.border}`, background: C.bg,
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Message…"
          style={{
            flex: 1, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 24, padding: "10px 16px", color: C.text, fontSize: 15,
            outline: "none", boxSizing: "border-box",
          }}
        />
        <button onClick={handleSend} disabled={!text.trim()} style={{
          background: text.trim() ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
          border: "none", borderRadius: "50%", width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: text.trim() ? "pointer" : "default",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? "#000" : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
