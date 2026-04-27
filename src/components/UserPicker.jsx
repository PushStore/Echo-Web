// File: src/components/UserPicker.jsx
//
// FIXES:
//   1. Background was `C.bgPrimary` which doesn't exist in theme.js
//      → rendered transparent/undefined. Fixed to use `C.bg` (#000).
//   2. getFollowing() returns { users: [...] } with full objects from the
//      native plugin, but the old code used { userIds: [] } and then
//      called getUserProfile() for each one (extra network calls).
//      Fixed to use the users array directly, with getUserProfile as fallback.
//   3. Shows full name + @handle in the list (was showing truncated userId).

import { useState, useEffect } from "react";
import { p2pBridge } from "../p2p-bridge.js";
import { C } from "../theme.js";

export default function UserPicker({ onSelectUser, onClose }) {
  const [users,       setUsers]       = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const result = await p2pBridge.getFollowing();

      // Native plugin returns { users: [{userId, name, handle, avatar},...] }
      // Mock returns { userIds: [...] } — handle both
      if (result.users && result.users.length > 0) {
        setUsers(result.users.map(u => ({
          userId:      u.userId,
          displayName: u.name || u.displayName || u.userId.slice(0, 16),
          handle:      u.handle || "",
          avatar:      u.avatar || u.avatarUrl || null,
        })));
        return;
      }

      // Fallback: userIds array (mock mode or older build)
      const ids = result.userIds || [];
      const details = [];
      for (const userId of ids.slice(0, 50)) {
        try {
          const r = await p2pBridge.getUserProfile({ userId });
          if (r.user) {
            details.push({
              userId,
              displayName: r.user.name || r.user.displayName || userId.slice(0, 16),
              handle:      r.user.handle || "",
              avatar:      r.user.avatar || r.user.avatarUrl || null,
            });
          }
        } catch (e) {
          // Profile not found — still add a minimal entry
          details.push({ userId, displayName: userId.slice(0, 16), handle: "", avatar: null });
        }
      }
      setUsers(details);
    } catch (err) {
      // Failed to load following list
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) { loadUsers(); return; }
    try {
      setLoading(true);
      const result = await p2pBridge.searchUsers({ query: searchQuery.trim(), limit: 20 });
      setUsers((result.users || []).map(u => ({
        userId:      u.userId,
        displayName: u.name || u.displayName || u.userId.slice(0, 16),
        handle:      u.handle || "",
        avatar:      u.avatar || u.avatarUrl || null,
      })));
    } catch (err) {
      // Search failed
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.handle.toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q)
    );
  });

  return (
    // FIX: was `C.bgPrimary` (undefined → transparent). Now solid #000.
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#000",          // solid black — no transparency
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "16px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#111",        // slightly elevated surface
      }}>
        <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
          New Message
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: C.muted,
            fontSize: 24, cursor: "pointer", padding: "4px 10px",
            borderRadius: 8,
          }}
        >✕</button>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: "#111" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search people you follow…"
            value={searchQuery}
            onInput={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{
              flex: 1,
              background: "#1a1a1a",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "10px 14px",
              color: C.text,
              fontSize: 15,
              outline: "none",
            }}
          />
          {searchQuery.trim() && (
            <button
              onClick={handleSearch}
              style={{
                background: C.accent, color: "#000",
                border: "none", borderRadius: 10,
                padding: "10px 16px", fontSize: 14, fontWeight: 600,
                cursor: "pointer", flexShrink: 0,
              }}
            >Search</button>
          )}
        </div>
      </div>

      {/* ── User list ── */}
      <div style={{ flex: 1, overflowY: "auto", background: "#000" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
            <p>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
            <p>{searchQuery.trim() ? "No results" : "No one to message yet"}</p>
            {!searchQuery.trim() && (
              <p style={{ fontSize: 13, marginTop: 8 }}>
                Follow someone first, then you can DM them.
              </p>
            )}
          </div>
        ) : (
          filtered.map((user) => {
            // Name initials from real name, not key
            const initials = user.displayName.trim()
              ? user.displayName.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
              : user.userId.slice(0, 2).toUpperCase();

            return (
              <div
                key={user.userId}
                onClick={() => onSelectUser(user)}
                style={{
                  padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer",
                  borderBottom: `1px solid ${C.border}`,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#111"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {/* Avatar */}
                {user.avatar ? (
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    backgroundImage: `url(${user.avatar})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                  }} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #6ee7b7, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, fontWeight: 700, color: "#000",
                  }}>
                    {initials}
                  </div>
                )}

                {/* Name + handle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: C.text, fontSize: 15, fontWeight: 700,
                    margin: 0, whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {user.displayName}
                  </p>
                  {user.handle && (
                    <p style={{
                      color: C.muted, fontSize: 13, margin: "2px 0 0",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      @{user.handle}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <span style={{ color: C.muted, fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
