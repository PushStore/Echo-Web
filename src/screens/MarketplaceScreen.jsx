// File: src/screens/MarketplaceScreen.jsx
import { useState, useEffect, useCallback } from "react";
import { C } from "../theme.js";

const CATEGORIES = ["All", "Technology", "Science", "Art", "Music", "Gaming", "Education", "News", "Health", "Sports", "Finance", "Lifestyle"];

const IcoGrid = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const IcoList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

function CategoryBadge({ label }) {
  return (
    <span style={{
      background: "rgba(110,231,183,0.12)", color: C.accent,
      fontSize: 11, fontWeight: 600, padding: "3px 8px",
      borderRadius: 10, display: "inline-block",
    }}>
      {label}
    </span>
  );
}

function TrendingCard({ item, onAvatarClick, viewMode }) {
  const isGrid = viewMode === "grid";
  return (
    <div onClick={() => console.log("[Marketplace] open item:", item.id)} style={{
      background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
      overflow: "hidden", cursor: "pointer",
      ...(isGrid ? { width: "48%", flexShrink: 0, marginBottom: 12 } : { marginBottom: 10 }),
    }}>
      {/* Thumbnail */}
      <div style={{
        height: isGrid ? 120 : 160, background: C.surface,
        backgroundSize: "cover", backgroundPosition: "center",
        ...(item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : {}),
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {!item.thumbnail && (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
        {item.price > 0 && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.75)", borderRadius: 10, padding: "3px 8px" }}>
            <span style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>${item.price}</span>
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ padding: isGrid ? 10 : 14 }}>
        <div style={{ fontWeight: 700, color: C.text, fontSize: isGrid ? 14 : 16, marginBottom: 4, lineHeight: 1.3 }}>
          {(item.title || "").length > 60 ? item.title.slice(0, 60) + "…" : item.title}
        </div>
        {item.category && <CategoryBadge label={item.category} />}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: C.accentDark,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#000", fontSize: 10, fontWeight: 800 }}>
              {(item.authorName || "?")[0]?.toUpperCase()}
            </span>
          </div>
          <span style={{ color: C.muted, fontSize: 12 }}>{item.authorName || "Anonymous"}</span>
          <div style={{ flex: 1 }}/>
          <span style={{ color: C.muted, fontSize: 11 }}>
            {"❤ "}{item.likes || 0} · {"💬 "}{item.commentCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceScreen({ p2p, me, onAvatarClick, onPublishClick }) {
  const [searchQuery,    setSearchQuery]    = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode,       setViewMode]       = useState("list");
  const [trendingItems,  setTrendingItems]  = useState([]);
  const [latestItems,    setLatestItems]    = useState([]);
  const [loading,        setLoading]        = useState(true);

  // ── Load data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!p2p) return;
    setLoading(true);
    try {
      const [trending, latest] = await Promise.all([
        p2p.marketplaceGetTrending?.().catch(() => ({ items: [] })),
        p2p.marketplaceSearch?.({ query: "" }).catch(() => ({ items: [] })),
      ]);
      setTrendingItems(trending.items || trending || []);
      setLatestItems(latest.items || latest || []);
    } catch (e) {
      console.error("[Marketplace] load failed:", e);
    }
    setLoading(false);
  }, [p2p]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!p2p) return;
    setLoading(true);
    try {
      if (activeCategory !== "All") {
        const r = await p2p.marketplaceGetByCategory?.({ category: activeCategory }).catch(() => ({ items: [] }));
        setLatestItems(r.items || r || []);
      } else {
        const r = await p2p.marketplaceSearch?.({ query: searchQuery }).catch(() => ({ items: [] }));
        setLatestItems(r.items || r || []);
      }
    } catch (e) {
      console.error("[Marketplace] search failed:", e);
    }
    setLoading(false);
  }, [p2p, searchQuery, activeCategory]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleSearch(); }, [activeCategory]);

  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.bg,
        padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 12 }}>Marketplace</div>
        {/* Search bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, overflow: "hidden" }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search marketplace…"
            style={{
              flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
              outline: "none", boxSizing: "border-box",
            }}
          />
          <button onClick={handleSearch} style={{
            background: "#D4AF37", border: "none",
            borderRadius: 10, padding: "10px 16px", color: "#000", fontWeight: 800,
            fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}>
            Search
          </button>
        </div>
        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              background: activeCategory === cat ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
              border: activeCategory === cat ? "none" : `1px solid ${C.border}`,
              borderRadius: 20, padding: "6px 14px", color: activeCategory === cat ? "#000" : C.text,
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              flexShrink: 0, WebkitTapHighlightColor: "transparent",
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px 0", gap: 6 }}>
        <button onClick={() => setViewMode("grid")} style={{
          background: viewMode === "grid" ? C.accentDark : C.surface,
          border: `1px solid ${viewMode === "grid" ? C.accent : C.border}`,
          borderRadius: 8, padding: 6, cursor: "pointer",
        }}><IcoGrid /></button>
        <button onClick={() => setViewMode("list")} style={{
          background: viewMode === "list" ? C.accentDark : C.surface,
          border: `1px solid ${viewMode === "list" ? C.accent : C.border}`,
          borderRadius: 8, padding: 6, cursor: "pointer",
        }}><IcoList /></button>
      </div>

      {/* Trending section */}
      {!loading && trendingItems.length > 0 && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>🔥</span> Trending
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {trendingItems.slice(0, 5).map((item, i) => (
              <div key={item.id || i} onClick={() => console.log("[Marketplace] open trending:", item.id)} style={{
                flexShrink: 0, width: 220, background: C.card, borderRadius: 14,
                border: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer",
              }}>
                <div style={{
                  height: 110, background: C.surface, backgroundSize: "cover", backgroundPosition: "center",
                  ...(item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : {}),
                }}/>
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>
                    {item.title?.slice(0, 40)}{item.title?.length > 40 ? "…" : ""}
                  </div>
                  {item.description && (
                    <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.4, marginBottom: 6 }}>
                      {item.description.slice(0, 60)}{item.description.length > 60 ? "…" : ""}
                    </div>
                  )}
                  <div style={{ color: C.muted, fontSize: 11 }}>
                    by {item.authorName || "Anonymous"} · ❤ {item.likes || 0}
                  </div>
                  {item.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {item.tags.slice(0, 3).map(t => (
                        <span key={t} style={{ background: C.surface, color: C.muted, fontSize: 10, padding: "2px 6px", borderRadius: 6 }}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest section */}
      <div style={{ padding: "0 14px 14px" }}>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>✨</span> Latest
        </div>
        {loading && <div style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading…</div>}
        {!loading && latestItems.length === 0 && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 15 }}>No items found</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Publish something to the marketplace!</div>
          </div>
        )}
        <div style={{ display: viewMode === "grid" ? "flex" : "block", flexWrap: "wrap", gap: viewMode === "grid" ? "4% 0" : 0, justifyContent: "space-between" }}>
          {latestItems.map((item, i) => (
            <TrendingCard key={item.id || i} item={item} onAvatarClick={onAvatarClick} viewMode={viewMode} />
          ))}
        </div>
      </div>

      {/* FAB — Publish */}
      <button onClick={onPublishClick} style={{
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
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
