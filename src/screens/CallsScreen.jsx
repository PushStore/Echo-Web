// File: src/screens/CallsScreen.jsx
// Redesigned: Android Phone-app style — favorites row + recent calls list, no tabs.
import { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../theme.js";
import UserPicker from "../components/UserPicker.jsx";
import ActiveCallScreen from "./ActiveCallScreen.jsx";

// ─── Call type icons ─────────────────────────────────────────────────────────
const AudioIcon = ({ size = 18, color = C.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const VideoIcon = ({ size = 18, color = C.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);

const CALL_TYPE_ICONS = {
  audio: (props) => <AudioIcon {...props} />,
  video: (props) => <VideoIcon {...props} />,
};

const CALL_DIRECTION = {
  incoming: { color: C.accent, label: "Incoming" },
  outgoing: { color: C.muted, label: "Outgoing" },
  missed:   { color: C.danger, label: "Missed" },
};

const MAX_FAVORITES = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitial(name) {
  return (name || "?")[0]?.toUpperCase() || "?";
}

function getInitials(name) {
  if (!name || !name.trim()) return "??";
  return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Avatar component ────────────────────────────────────────────────────────
function Avatar({ name, avatar, size = 44 }) {
  if (avatar) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        backgroundImage: `url(${avatar})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.accentDark}, ${C.accent})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 800, color: "#000",
    }}>
      {size < 40 ? getInitial(name) : getInitials(name)}
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function CallsScreen({ p2p, me, onAvatarClick }) {
  const [callHistory,    setCallHistory]    = useState([]);
  const [favorites,      setFavorites]      = useState([]);
  const [showAllFavs,    setShowAllFavs]    = useState(false);
  const [activeCall,     setActiveCall]     = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showNewCall,    setShowNewCall]    = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [callType,       setCallType]       = useState("audio");
  const [error,          setError]          = useState(null);
  const [initiating,     setInitiating]     = useState(false);
  const errorTimer       = useRef(null);

  // ── Error handling (auto-dismiss after 4s) ──────────────────────────────
  const showError = useCallback((msg) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4000);
  }, []);

  useEffect(() => () => { if (errorTimer.current) clearTimeout(errorTimer.current); }, []);

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!p2p) return;
    setLoading(true);
    try {
      const [historyRes, activeRes] = await Promise.all([
        p2p.callGetHistory?.().catch(() => ({ calls: [] })),
        p2p.callGetActive?.().catch(() => ({ call: null })),
      ]);
      setCallHistory(historyRes.calls || historyRes || []);
      setActiveCall(activeRes.call || null);
    } catch (e) {
      console.error("[Calls] load failed:", e);
    }
    setLoading(false);
  }, [p2p]);

  const loadFavorites = useCallback(async () => {
    if (!p2p || !me?.userId) return;
    try {
      const res = await p2p.getFollowing?.({ userId: me.userId });
      if (res?.users && Array.isArray(res.users)) {
        setFavorites(res.users);
      }
    } catch (e) {
      // Silently fail — favorites are optional
      console.warn("[Calls] failed to load favorites:", e);
    }
  }, [p2p, me?.userId]);

  useEffect(() => {
    loadData();
    loadFavorites();
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, [loadData, loadFavorites]);

  // ── Initiate call (FIXED: calleeId + callerId + callType) ──────────────
  const handleInitiate = async (contact, type) => {
    const targetContact = contact || selectedContact;
    const targetType = type || callType;
    if (!p2p || !targetContact) return;

    setInitiating(true);
    try {
      const r = await p2p.callInitiate?.({
        calleeId: targetContact.userId,
        callerId: me?.userId,
        callType: targetType,
      });
      if (r?.callId) {
        setActiveCall({ ...r, peer: targetContact, callType: targetType });
        setShowNewCall(false);
        setSelectedContact(null);
      } else {
        showError(r?.error || "Failed to initiate call. Please try again.");
      }
    } catch (e) {
      showError(e?.message || "Unknown error");
    } finally {
      setInitiating(false);
    }
  };

  // ── Redial from recent calls ────────────────────────────────────────────
  const handleRedial = (call) => {
    const contact = {
      userId: call.peerId || call.peer?.userId,
      displayName: call.peerName || call.peer?.name || "Unknown",
      handle: call.peerHandle || call.peer?.handle || "",
      avatar: call.peerAvatar || call.peer?.avatar || null,
    };
    if (!contact.userId) {
      showError("Cannot redial — missing contact info.");
      return;
    }
    // Show the call screen directly
    setSelectedContact(contact);
    setCallType(call.callType || "audio");
  };

  // ── Handle contact selection from UserPicker ────────────────────────────
  const handleSelectContact = (user) => {
    setSelectedContact(user);
    setShowNewCall(false);
  };

  // ── Call ended callback ─────────────────────────────────────────────────
  const handleCallEnd = useCallback(() => {
    setActiveCall(null);
    loadData();
  }, [loadData]);

  // ── Active call view ────────────────────────────────────────────────────
  if (activeCall) {
    return (
      <ActiveCallScreen
        call={activeCall}
        p2p={p2p}
        onEnd={handleCallEnd}
      />
    );
  }

  // ── New call modal (contact selected, pick call type & dial) ────────────
  if (selectedContact) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
          background: C.bg,
        }}>
          <button onClick={() => setSelectedContact(null)} style={{
            background: "none", border: "none", color: C.text,
            fontSize: 22, cursor: "pointer", padding: "0 4px",
          }}>←</button>
          <span style={{ fontWeight: 800, color: C.text, fontSize: 18 }}>New Call</span>
        </div>

        {/* Inline error */}
        {error && (
          <div style={{
            padding: "10px 16px", background: "rgba(244,33,46,0.12)",
            borderBottom: `1px solid ${C.border}`, display: "flex",
            alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ color: C.danger, fontSize: 13 }}>{error}</span>
            {error.includes("not connected") && (
              <button onClick={() => handleInitiate()} style={{
                background: "none", border: "none", color: C.accent,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Retry</button>
            )}
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <span style={{ color: "#000", fontSize: 32, fontWeight: 800 }}>
              {getInitial(selectedContact.displayName || selectedContact.name)}
            </span>
          </div>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {selectedContact.displayName || selectedContact.name || "Unknown"}
          </div>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 30 }}>
            @{selectedContact.handle || ""}
          </div>

          {/* Call type toggle */}
          <div style={{ display: "flex", gap: 12, marginBottom: 30 }}>
            <button onClick={() => setCallType("audio")} style={{
              background: callType === "audio"
                ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
              border: callType === "audio" ? "none" : `1px solid ${C.border}`,
              borderRadius: 14, padding: "14px 24px",
              color: callType === "audio" ? "#000" : C.text,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 6, minWidth: 100,
            }}>
              <AudioIcon size={24} color="currentColor" />
              Audio
            </button>
            <button onClick={() => setCallType("video")} style={{
              background: callType === "video"
                ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
              border: callType === "video" ? "none" : `1px solid ${C.border}`,
              borderRadius: 14, padding: "14px 24px",
              color: callType === "video" ? "#000" : C.text,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 6, minWidth: 100,
            }}>
              <VideoIcon size={24} color="currentColor" />
              Video
            </button>
          </div>

          {/* Call button */}
          <button
            onClick={() => handleInitiate()}
            disabled={initiating}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: initiating ? C.muted : C.accent,
              border: "none", cursor: initiating ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(110,231,183,0.4)",
              opacity: initiating ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Main view: Favorites + Recent Calls ─────────────────────────────────
  const displayFavorites = showAllFavs ? favorites : favorites.slice(0, MAX_FAVORITES);

  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>

      {/* ── Sticky Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.bg, padding: "12px 16px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontWeight: 800, color: C.text, fontSize: 20, display: "block" }}>
          Calls
        </span>
      </div>

      {/* ── Inline error banner ── */}
      {error && (
        <div style={{
          padding: "10px 16px", background: "rgba(244,33,46,0.12)",
          borderBottom: `1px solid ${C.border}`, display: "flex",
          alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ color: C.danger, fontSize: 13 }}>{error}</span>
          {error.includes("not connected") && (
            <button onClick={() => loadData()} style={{
              background: "none", border: "none", color: C.accent,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Retry</button>
          )}
        </div>
      )}

      {loading && (
        <div style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</div>
      )}

      {!loading && (
        <>
          {/* ── Section 1: Favorites (horizontal row) ── */}
          {favorites.length > 0 && (
            <section style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px 0",
              }}>
                <span style={{ color: C.muted, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Favorites
                </span>
                {favorites.length > MAX_FAVORITES && (
                  <button onClick={() => setShowAllFavs(v => !v)} style={{
                    background: "none", border: "none", color: C.accent,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0,
                  }}>
                    {showAllFavs ? "Show less" : `See all (${favorites.length})`}
                  </button>
                )}
              </div>

              <div style={{
                display: "flex", gap: 16, padding: "14px 16px 16px",
                overflowX: "auto", WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
              }}>
                {displayFavorites.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleRedial({ peerId: user.userId, peerName: user.name || user.displayName, peerHandle: user.handle, peerAvatar: user.avatar || user.avatarUrl, callType: "audio" })}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 6, minWidth: 60, flexShrink: 0,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <Avatar
                      name={user.name || user.displayName}
                      avatar={user.avatar || user.avatarUrl}
                      size={52}
                    />
                    <span style={{
                      color: C.text, fontSize: 11, fontWeight: 500,
                      maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", textAlign: "center",
                    }}>
                      {user.name || user.displayName || user.handle || "…"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Section 2: Recent Calls ── */}
          <section>
            <div style={{ padding: "14px 16px 0" }}>
              <span style={{ color: C.muted, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Recent
              </span>
            </div>

            {callHistory.length === 0 && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.surface, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AudioIcon size={28} />
                </div>
                <div style={{ color: C.muted, fontSize: 15 }}>No recent calls</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
                  Tap the button below to make your first call.
                </div>
              </div>
            )}

            {callHistory.map((call, i) => {
              const dir = CALL_DIRECTION[call.direction] || CALL_DIRECTION.outgoing;
              const CallIcon = CALL_TYPE_ICONS[call.callType] || CALL_TYPE_ICONS.audio;
              const name = call.peerName || call.peer?.name || "Unknown";
              const missed = call.direction === "missed";

              return (
                <div
                  key={call.callId || i}
                  onClick={() => handleRedial(call)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                    background: "transparent", transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Avatar
                    name={name}
                    avatar={call.peerAvatar || call.peer?.avatar}
                    size={44}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 15, marginBottom: 2,
                      color: missed ? C.danger : C.text,
                    }}>
                      {name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CallIcon size={14} color={missed ? C.danger : C.muted} />
                      <span style={{ color: C.muted, fontSize: 13 }}>
                        {formatDuration(call.duration)} · {formatTimestamp(call.timestamp)}
                      </span>
                    </div>
                  </div>

                  <span style={{
                    fontSize: 11, fontWeight: 600, color: dir.color,
                    padding: "3px 8px", borderRadius: 8,
                    background: missed ? "rgba(244,33,46,0.12)" : C.surface,
                    flexShrink: 0,
                  }}>
                    {dir.label}
                  </span>
                </div>
              );
            })}
          </section>

          {/* Bottom spacer for FAB */}
          <div style={{ height: 80 }} />
        </>
      )}

      {/* ── FAB — New call ── */}
      <button onClick={() => setShowNewCall(true)} style={{
        position: "fixed",
        bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 56px)",
        right: 58, width: 56, height: 56, borderRadius: "50%",
        background: "#D4AF37",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,.25)",
        zIndex: 30, WebkitTapHighlightColor: "transparent",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </button>

      {/* ── User picker modal ── */}
      {showNewCall && (
        <UserPicker onSelectUser={handleSelectContact} onClose={() => setShowNewCall(false)} />
      )}
    </div>
  );
}
