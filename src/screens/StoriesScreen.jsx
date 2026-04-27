// File: src/screens/StoriesScreen.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../theme.js";
import StoryCamera from "./StoryCamera.jsx";

// ── Story Ring ────────────────────────────────────────────────────────────────
function StoryRing({ user, hasUnseen, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 4, cursor: "pointer", WebkitTapHighlightColor: "transparent",
      flexShrink: 0, width: 68,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", padding: 3,
        background: hasUnseen
          ? `linear-gradient(135deg, ${C.accent}, ${C.accentDark}, #6366f1)`
          : C.border,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: C.bg, padding: 2,
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            ...(user.avatar ? { backgroundImage: `url(${user.avatar})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
          }}>
            {!user.avatar && (
              <span style={{ color: "#000", fontSize: 22, fontWeight: 800 }}>
                {(user.name || "?")[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
      <span style={{ color: C.text, fontSize: 11, fontWeight: 600, maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.name || "Unknown"}
      </span>
    </div>
  );
}

// ── Story Viewer ─────────────────────────────────────────────────────────────
function StoryViewer({ storyFeed, viewingUserIdx, viewingStoryIdx, onNext, onPrev, onClose, replyText, setReplyText, onReply, p2p }) {
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const STORY_DURATION = 5;

  const feedEntries = Object.values(storyFeed);
  const userStories = feedEntries[viewingUserIdx] || [];
  const story = userStories[viewingStoryIdx] || {};

  // Auto-advance timer (before early return to satisfy rules-of-hooks)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!userStories.length) return;
    setTimeLeft(STORY_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onNext();
          return STORY_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [viewingUserIdx, viewingStoryIdx]);

  // Mark as viewed (before early return to satisfy rules-of-hooks)
  useEffect(() => {
    if (p2p && story.storyId) {
      p2p.storyView?.({ storyId: story.storyId }).catch(() => {});
    }
  }, [story.storyId, p2p]);

  if (feedEntries.length === 0 || viewingUserIdx >= feedEntries.length) return null;
  if (!userStories.length || viewingStoryIdx >= userStories.length) return null;

  const user = story.user || {};
  const hoursLeft = story.expiresAt ? Math.max(0, Math.round((story.expiresAt - Date.now()) / 3600000)) : 24;
  const progressPct = ((STORY_DURATION - timeLeft) / STORY_DURATION) * 100;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000", display: "flex", flexDirection: "column" }}>
      {/* Progress bars */}
      <div style={{ display: "flex", gap: 3, padding: "14px 14px 0", zIndex: 2 }}>
        {userStories.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: C.border, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: C.accent,
              width: i < viewingStoryIdx ? "100%" : i === viewingStoryIdx ? `${progressPct}%` : "0%",
              transition: i === viewingStoryIdx ? "width 1s linear" : "none",
            }}/>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", zIndex: 2,
        position: "absolute", top: 24, left: 0, right: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          ...(user.avatar ? { backgroundImage: `url(${user.avatar})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
        }}>
          {!user.avatar && (
            <span style={{ color: "#000", fontSize: 14, fontWeight: 800 }}>{(user.name || "?")[0]?.toUpperCase()}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{user.name || "Unknown"}</div>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>{hoursLeft}h remaining</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", padding: 4 }}>×</button>
      </div>

      {/* Tap zones */}
      <div onClick={onPrev} style={{ position: "absolute", left: 0, top: 0, bottom: 80, width: "30%", zIndex: 1, cursor: "pointer" }}/>
      <div onClick={onNext} style={{ position: "absolute", right: 0, top: 0, bottom: 80, width: "70%", zIndex: 1, cursor: "pointer" }}/>

      {/* Story content */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {story.mediaUrl ? (
          story.type === "video" ? (
            <video src={story.mediaUrl} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          ) : (
            <img src={story.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          )
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, #064e3b, #111, #1e1b4b)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 40,
          }}>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, textAlign: "center", lineHeight: 1.5 }}>
              {story.text || "No content"}
            </div>
          </div>
        )}
      </div>

      {/* Reply bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 14px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        borderTop: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.85)", zIndex: 2,
      }}>
        <input
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder={`Reply to ${user.name || "story"}…`}
          style={{
            flex: 1, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)",
            borderRadius: 24, padding: "10px 16px", color: "#fff", fontSize: 14,
            outline: "none", boxSizing: "border-box",
          }}
          onKeyDown={e => e.key === "Enter" && replyText.trim() && onReply()}
        />
        <button onClick={onReply} disabled={!replyText.trim()} style={{
          background: replyText.trim() ? C.accent : "rgba(255,255,255,.1)",
          border: "none", borderRadius: "50%", width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={replyText.trim() ? "#000" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Stories Screen ─────────────────────────────────────────────────────
export default function StoriesScreen({ p2p, me, onAvatarClick }) {
  const [storyFeed,       setStoryFeed]       = useState({});
  const [viewingUserIdx,  setViewingUserIdx]  = useState(null);
  const [viewingStoryIdx, setViewingStoryIdx] = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [showCamera,      setShowCamera]      = useState(false);
  const [replyText,       setReplyText]       = useState("");

  // ── Load story feed ────────────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    if (!p2p) return;
    try {
      const r = await p2p.storyGetFeed?.().catch(() => ({ feed: {} }));
      setStoryFeed(r.feed || r || {});
    } catch (e) {
      console.error("[Stories] loadFeed failed:", e);
    }
    if (loading) setLoading(false);
  }, [p2p, loading]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const feedEntries = Object.values(storyFeed);
  const feedKeys    = Object.keys(storyFeed);

  // ── Navigation ─────────────────────────────────────────────────────────
  const openStory = (idx) => {
    setViewingUserIdx(idx);
    setViewingStoryIdx(0);
    setReplyText("");
  };

  const handleNext = useCallback(() => {
    if (!viewingUserIdx && viewingUserIdx !== 0) return;
    const userStories = feedEntries[viewingUserIdx];
    if (!userStories) return;
    if (viewingStoryIdx + 1 < userStories.length) {
      setViewingStoryIdx(prev => prev + 1);
    } else if (viewingUserIdx + 1 < feedEntries.length) {
      setViewingUserIdx(prev => prev + 1);
      setViewingStoryIdx(0);
    } else {
      setViewingUserIdx(null);
    }
  }, [viewingUserIdx, viewingStoryIdx, feedEntries]);

  const handlePrev = useCallback(() => {
    if (viewingStoryIdx > 0) {
      setViewingStoryIdx(prev => prev - 1);
    } else if (viewingUserIdx > 0) {
      const prevIdx = viewingUserIdx - 1;
      const prevStories = feedEntries[prevIdx];
      setViewingUserIdx(prevIdx);
      setViewingStoryIdx((prevStories?.length || 1) - 1);
    }
  }, [viewingUserIdx, viewingStoryIdx, feedEntries]);

  // ── Reply ──────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!replyText.trim() || !p2p || viewingUserIdx == null) return;
    const userStories = feedEntries[viewingUserIdx];
    const story = userStories?.[viewingStoryIdx];
    if (!story) return;
    try {
      await p2p.storyReply?.({ storyId: story.storyId, text: replyText.trim() });
    } catch (e) {
      console.error("[Stories] reply failed:", e);
    }
    setReplyText("");
  };

  // ── Story posted callback ──────────────────────────────────────────────
  const handlePosted = useCallback(() => {
    setShowCamera(false);
    loadFeed();
  }, [loadFeed]);

  // ── Viewer ─────────────────────────────────────────────────────────────
  if (viewingUserIdx != null) {
    return (
      <StoryViewer
        storyFeed={storyFeed}
        viewingUserIdx={viewingUserIdx}
        viewingStoryIdx={viewingStoryIdx}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => setViewingUserIdx(null)}
        replyText={replyText}
        setReplyText={setReplyText}
        onReply={handleReply}
        p2p={p2p}
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
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 800, color: C.text, fontSize: 20 }}>Stories</span>
        <button onClick={() => setShowCamera(true)} style={{
          background: `linear-gradient(90deg,${C.accentDark},${C.accent})`, border: "none",
          borderRadius: 20, padding: "7px 16px", color: "#000", fontWeight: 800,
          fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Story
        </button>
      </div>

      {/* Your story (always first) */}
      <div style={{ padding: "16px 14px 8px" }}>
        <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 12, paddingLeft: 2 }}>YOUR STORY</div>
        <div onClick={() => setShowCamera(true)} style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 4, cursor: "pointer", width: 68, flexShrink: 0,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", padding: 3,
            background: C.border, position: "relative",
          }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: C.bg, padding: 2,
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: `linear-gradient(135deg,${C.accentDark},${C.accent})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
                ...(me?.avatar ? { backgroundImage: `url(${me.avatar})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
              }}>
                {!me?.avatar && (
                  <span style={{ color: "#000", fontSize: 22, fontWeight: 800 }}>
                    {(me?.name || "?")[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 24, height: 24, borderRadius: "50%",
              background: C.accent, border: `2px solid ${C.bg}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </div>
          <span style={{ color: C.muted, fontSize: 11 }}>Add</span>
        </div>
      </div>

      {/* Story rings row */}
      <div style={{ padding: "8px 14px 16px" }}>
        <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 12, paddingLeft: 2 }}>RECENT UPDATES</div>
        {loading && <div style={{ padding: 20, textAlign: "center", color: C.muted }}>Loading stories…</div>}
        {!loading && feedEntries.length === 0 && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 15 }}>No stories yet</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Be the first to share a moment!</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
          {feedEntries.map((stories, i) => {
            const firstStory = stories?.[0];
            const user = firstStory?.user || {};
            const hasUnseen = stories?.some(s => !s.viewed) ?? true;
            return (
              <StoryRing
                key={feedKeys[i]}
                user={user}
                hasUnseen={hasUnseen}
                onClick={() => openStory(i)}
              />
            );
          })}
        </div>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <StoryCamera p2p={p2p} onClose={() => setShowCamera(false)} onPosted={handlePosted} />
      )}
    </div>
  );
}
