// File: src/screens/GroupListScreen.jsx
import { useState, useEffect, useCallback } from "react";
import { C } from "../theme.js";
import GroupCreateModal from "./GroupCreateModal.jsx";
import GroupChatView from "./GroupChatView.jsx";

export default function GroupListScreen({ p2p, me, onAvatarClick }) {
  const [groups,        setGroups]        = useState([]);
  const [discoverGroups,setDiscoverGroups]= useState([]);
  const [tab,           setTab]           = useState("my");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [loading,       setLoading]       = useState(true);

  // ── Load groups ────────────────────────────────────────────────────────
  const loadMyGroups = useCallback(async () => {
    if (!p2p) return;
    try {
      const r = await p2p.groupGetMy?.().catch(() => ({ groups: [] }));
      setGroups(r.groups || r || []);
    } catch (e) {
      console.error("[Groups] loadMyGroups failed:", e);
    }
  }, [p2p]);

  const loadDiscover = useCallback(async () => {
    if (!p2p) return;
    try {
      const r = await p2p.groupSearch?.({ query: searchQuery }).catch(() => ({ groups: [] }));
      setDiscoverGroups(r.groups || r || []);
    } catch (e) {
      console.error("[Groups] loadDiscover failed:", e);
    }
  }, [p2p, searchQuery]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadMyGroups(), loadDiscover()]);
      setLoading(false);
    };
    init();
  }, [loadMyGroups, loadDiscover]);

  // ── Join group ─────────────────────────────────────────────────────────
  const handleJoin = async (groupId) => {
    if (!p2p) return;
    try {
      await p2p.groupJoin?.({ groupId });
      await loadMyGroups();
      await loadDiscover();
    } catch (e) {
      alert("Failed to join group: " + (e.message || "Unknown error"));
    }
  };

  // ── Group created callback ─────────────────────────────────────────────
  const handleCreated = useCallback(() => {
    setShowCreate(false);
    loadMyGroups();
  }, [loadMyGroups]);

  // ── Group chat view (conditional render) ───────────────────────────────
  if (selectedGroup) {
    return (
      <GroupChatView
        group={selectedGroup}
        onBack={() => { setSelectedGroup(null); loadMyGroups(); }}
        p2p={p2p}
        me={me}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.bg,
        padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 800, color: C.text, fontSize: 20 }}>Groups</span>
          <button onClick={() => setShowCreate(true)} style={{
            background: "#D4AF37", border: "none",
            borderRadius: 20, padding: "7px 16px", color: "#000", fontWeight: 800,
            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create
          </button>
        </div>

        {/* Search */}
        {tab === "discover" && (
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search groups…"
            style={{
              width: "100%", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
              outline: "none", boxSizing: "border-box", marginBottom: 10,
            }}
          />
        )}

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {[["my", "My Groups"], ["discover", "Discover"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              padding: "10px 0 8px", color: tab === id ? C.text : C.muted,
              fontWeight: tab === id ? 700 : 400, fontSize: 15,
              position: "relative", WebkitTapHighlightColor: "transparent",
            }}>
              {label}
              {tab === id && (
                <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 54, height: 3, background: C.accent, borderRadius: 2 }}/>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && <div style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</div>}

      {!loading && tab === "my" && groups.length === 0 && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 15 }}>No groups yet</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Create or join a group to get started!</div>
        </div>
      )}

      {!loading && tab === "discover" && discoverGroups.length === 0 && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 15 }}>No groups found</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Try a different search or create your own.</div>
        </div>
      )}

      {/* My Groups list */}
      {tab === "my" && groups.map((group, i) => (
        <div key={group.groupId || i} onClick={() => setSelectedGroup(group)} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
          cursor: "pointer", WebkitTapHighlightColor: "transparent",
        }}>
          {/* Group avatar */}
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#000", fontSize: 20, fontWeight: 800 }}>
              {(group.name || "G")[0]?.toUpperCase()}
            </span>
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 2 }}>
              {group.name}
            </div>
            <div style={{ color: C.muted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {group.lastMessage || group.description || `${group.memberCount || 0} members`}
            </div>
          </div>
          {/* Right side */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            {group.unreadCount > 0 && (
              <div style={{
                background: C.accent, color: "#000", borderRadius: 10,
                padding: "2px 8px", fontSize: 11, fontWeight: 800,
              }}>
                {group.unreadCount}
              </div>
            )}
            <span style={{ color: C.muted, fontSize: 11 }}>{group.memberCount || 0} members</span>
          </div>
        </div>
      ))}

      {/* Discover list */}
      {tab === "discover" && discoverGroups.map((group, i) => (
        <div key={group.groupId || i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#000", fontSize: 20, fontWeight: 800 }}>
              {(group.name || "G")[0]?.toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 2 }}>
              {group.name}
            </div>
            <div style={{ color: C.muted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {group.description || "No description"}
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{group.memberCount || 0} members</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleJoin(group.groupId); }} style={{
            background: "#D4AF37", border: "none",
            borderRadius: 20, padding: "8px 16px", color: "#000", fontWeight: 800,
            fontSize: 13, cursor: "pointer", flexShrink: 0,
          }}>
            Join
          </button>
        </div>
      ))}

      {/* Create modal */}
      {showCreate && (
        <GroupCreateModal
          p2p={p2p}
          me={me}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
