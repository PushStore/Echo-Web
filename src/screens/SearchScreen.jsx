// File: src/screens/SearchScreen.jsx
import { useState } from "react";
import { C, IcoSearch } from "../theme.js";
import EchoLogo from "../components/EchoLogo.jsx";
import Avatar from "../components/Avatar.jsx";

export default function SearchScreen({ p2p, me, following, onUserClick, onFollow }) {
    const [q,        setQ]        = useState("");
    const [results,  setResults]  = useState([]);
    const [busy,     setBusy]     = useState(false);

    const doSearch = async () => {
        if (!q.trim() || !p2p) return;
        setBusy(true);
        try {
            const term = q.trim().replace(/^@/, "").toLowerCase();
            const selfMatch = me && me.handle && me.handle.toLowerCase().includes(term);
            const r = await p2p.searchUsers({ query: term });
            let users = r.users || [];
            users = users.filter(u => u.userId !== me?.userId);
            if (selfMatch && me) {
                users = [
                    { userId: me.userId, name: me.name, handle: me.handle, avatar: me.avatar, online: true, isSelf: true },
                    ...users,
                ];
            }
            setResults(users);
        } catch (e) {
            console.error('[SearchScreen] Search failed:', e);
            setResults([]);
        }
        setBusy(false);
    };

    const handleFollow = async (userId, e) => {
        e.stopPropagation(); // Prevent triggering user click
        await onFollow?.(userId);
        // Update local results to show "Following" state immediately
        setResults(prev => prev.map(u => 
            u.userId === userId ? { ...u, isFollowing: true } : u
        ));
    };

    const handleUserClick = (user) => {
        if (user.isSelf) {
            onUserClick?.(null); // null = view my own profile
        } else {
            onUserClick?.(user); // user object = view other profile
        }
    };

    return (
        <div style={{flex: 1, overflowY: "auto", minWidth: 0}}>
            {/* Search bar */}
            <div style={{
                position: "sticky",
                top: 0,
                background: C.bg,
                padding: "12px 14px",
                borderBottom: `1px solid ${C.border}`
            }}>
                <div style={{
                    background: C.surface,
                    borderRadius: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 16px",
                    border: `1px solid ${C.border}`,
                    overflow: "hidden"
                }}>
                    <IcoSearch color={C.muted} />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && doSearch()}
                        placeholder="Search by @username"
                        style={{
                            background: "none",
                            border: "none",
                            outline: "none",
                            color: C.text,
                            fontSize: 16,
                            flex: 1,
                            minWidth: 0
                        }}
                    />
                    {q && (
                        <button
                            onClick={doSearch}
                            style={{
                                background: "none",
                                border: "none",
                                color: C.accent,
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: "pointer",
                                padding: 0,
                                flexShrink: 0
                            }}
                        >
                            Search
                        </button>
                    )}
                </div>
            </div>

            {/* Loading */}
            {busy && (
                <div style={{padding: 32, textAlign: "center", color: C.muted}}>
                    Searching peers…
                </div>
            )}

            {/* Results */}
            {!busy && results.map(u => (
                <div
                    key={u.userId}
                    onClick={() => handleUserClick(u)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    <Avatar src={u.avatar} seed={u.userId} size={46} />
                    <div style={{flex: 1}}>
                        <div style={{display: "flex", alignItems: "center", gap: 6}}>
                            <div style={{color: C.text, fontWeight: 700, fontSize: 14.5}}>
                                {u.name}
                            </div>
                            {u.isSelf && (
                                <span style={{
                                    color: C.accent,
                                    fontSize: 11,
                                    background: "rgba(110,231,183,0.12)",
                                    borderRadius: 8,
                                    padding: "1px 7px"
                                }}>
                                    You
                                </span>
                            )}
                        </div>
                        <div style={{color: C.muted, fontSize: 13}}>
                            @{u.handle} {u.online && <span style={{color: C.accent}}>· online</span>}
                        </div>
                    </div>
                    {!u.isSelf && (
                        following?.includes(u.userId) || u.isFollowing
                            ? <span style={{color: C.muted, fontSize: 13, padding: "7px 16px"}}>Following</span>
                            : <button
                                onClick={(e) => handleFollow(u.userId, e)}
                                style={{
                                    background: C.text,
                                    color: "#000",
                                    border: "none",
                                    borderRadius: 20,
                                    padding: "7px 16px",
                                    fontWeight: 700,
                                    fontSize: 13.5,
                                    cursor: "pointer"
                                }}
                            >
                                Follow
                            </button>
                    )}
                </div>
            ))}

            {/* No results */}
            {!busy && results.length === 0 && q && (
                <div style={{padding: 40, textAlign: "center", color: C.muted}}>
                    No users found for "@{q.replace(/^@/, "")}"
                </div>
            )}

            {/* Empty state */}
            {!q && (
                <div style={{
                    padding: 48,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14
                }}>
                    <EchoLogo size={36} />
                    <p style={{color: C.muted, fontSize: 14, margin: 0}}>
                        Search by @username.<br />Results come directly from the peer network.
                    </p>
                </div>
            )}
        </div>
    );
}
