// File: src/components/dm/ConversationList.jsx
import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import EchoLogo from "../EchoLogo.jsx";

function formatTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60000)    return "now";
  if (diff < 3600000)  return Math.floor(diff / 60000) + "m";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  return new Date(ts).toLocaleDateString();
}

function Avatar({ name, userId, avatarUrl, size = 50 }) {
  const initials = name?.trim()
    ? name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (userId || "??").slice(0, 2).toUpperCase();

  if (avatarUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center",
        border: `1px solid ${C.border}`,
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #6ee7b7, #059669)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: "#000",
    }}>
      {initials}
    </div>
  );
}

// ── Online users horizontal strip ────────────────────────────────────────────
function OnlineStrip({ p2p }) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const r = await p2p.getFollowing();
        // Both { users: [...] } and { userIds: [...] } shapes
        const users = r.users || [];
        setOnlineUsers(users.filter(u => u.online === true || u.online === 1));
      } catch (e) { /* silent */ }
    }
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [p2p]);

  if (onlineUsers.length === 0) return null;

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      paddingTop: 10, paddingBottom: 10,
    }}>
      <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, margin: "0 0 8px 16px", textTransform: "uppercase" }}>
        Online now
      </p>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingLeft: 16, paddingRight: 16, scrollbarWidth: "none" }}>
        {onlineUsers.map(u => {
          const name = u.name || u.displayName || u.userId?.slice(0, 10);
          return (
            <div key={u.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Avatar name={name} userId={u.userId} avatarUrl={u.avatar || u.avatarUrl} size={44} />
                {/* green dot */}
                <div style={{
                  position: "absolute", bottom: 1, right: 1,
                  width: 11, height: 11, borderRadius: "50%",
                  background: "#00ba7c", border: "2px solid #000",
                }} />
              </div>
              <span style={{ color: C.muted, fontSize: 11, maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ConversationList({
  conversations, loading,
  selectMode, selectedConvIds,
  onSelect, onLongPress,
  onSelectAll, onExitSelect,
  onNewChat, onDeleteSelected,
  p2p,
}) {
  return (
    <>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#000",
        padding: "14px 16px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        {selectMode ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <span style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>
              {selectedConvIds.size} selected
            </span>
            <button onClick={onSelectAll} style={{ background: "#1a1a1a", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 12px", borderRadius: 8 }}>
              All
            </button>
          </div>
        ) : (
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0 }}>Messages</h2>
        )}

        {selectMode ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onDeleteSelected}
              disabled={selectedConvIds.size === 0}
              style={{ background: selectedConvIds.size > 0 ? "#ff3b30" : C.border, color: "#fff", border: "none", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: selectedConvIds.size > 0 ? "pointer" : "not-allowed" }}
            >🗑️ Delete</button>
            <button onClick={onExitSelect} style={{ background: "#1a1a1a", color: C.text, border: "none", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      {/* Online strip — shown above conversation list */}
      {!selectMode && <OnlineStrip p2p={p2p} />}

      {/* Conversation list */}
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
          <EchoLogo size={30} />
          <p style={{ marginTop: 16 }}>Loading…</p>
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <EchoLogo size={40} />
          <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>No conversations yet</p>
          <p style={{ color: C.muted, fontSize: 13, maxWidth: 260 }}>Tap the button below to message someone you follow.</p>
          <p style={{ color: C.muted, fontSize: 11, maxWidth: 300, fontStyle: "italic" }}>🔒 End-to-end encrypted · Kyber-768 + AES-256-GCM</p>
        </div>
      ) : (
        conversations.map((conv) => {
          const isSelected = selectedConvIds.has(conv.conversationId);

          // FIX: support both field names — new backend returns otherUserName,
          // UserPicker sets otherUserDisplayName
          const name = conv.otherUserName?.trim() || conv.otherUserDisplayName?.trim() || null;
          const handle = conv.otherUserHandle?.trim() || null;

          const displayName = name || (conv.otherUserId ? conv.otherUserId.slice(0, 14) + "…" : "Unknown");

          return (
            <div
              key={conv.conversationId}
              onContextMenu={(e) => { e.preventDefault(); onLongPress(conv.conversationId); }}
              onClick={() => onSelect(conv)}
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex", gap: 12, alignItems: "center",
                cursor: "pointer",
                background: isSelected ? "rgba(110,231,183,0.08)" : "transparent",
                outline: isSelected ? `2px solid ${C.accent}` : "none",
                outlineOffset: -2,
                borderRadius: selectMode ? 10 : 0,
                opacity: selectMode && !isSelected ? 0.55 : 1,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!selectMode) e.currentTarget.style.background = "#0f0f0f"; }}
              onMouseLeave={(e) => { if (!selectMode) e.currentTarget.style.background = isSelected ? "rgba(110,231,183,0.08)" : "transparent"; }}
            >
              {selectMode && (
                <div style={{ background: isSelected ? C.accent : "#1a1a1a", border: `2px solid ${C.border}`, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, color: "#000" }}>
                  {isSelected ? "✓" : ""}
                </div>
              )}

              <Avatar name={name} userId={conv.otherUserId} avatarUrl={conv.otherUserAvatar} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }}>
                    {displayName}
                  </h3>
                  <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 6 }}>
                    {formatTime(conv.latestTimestamp)}
                  </span>
                </div>

                {handle && (
                  <p style={{ color: C.muted, fontSize: 12, margin: "1px 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    @{handle}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                  <p style={{
                    color: conv.unreadCount > 0 ? C.text : C.muted,
                    fontSize: 13, margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    fontWeight: conv.unreadCount > 0 ? 600 : 400,
                  }}>
                    {conv.latestMessagePreview || (
                      conv.messageType === "image" ? "📷 Photo" :
                      conv.messageType === "video" ? "🎥 Video" :
                      conv.messageType === "audio" ? "🎤 Voice note" : "…"
                    )}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span style={{ background: C.accent, color: "#000", fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 10, minWidth: 20, textAlign: "center", flexShrink: 0, marginLeft: 6 }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
