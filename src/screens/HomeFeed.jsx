import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../theme.js";
import EchoLogo from "../components/EchoLogo.jsx";
import Avatar from "../components/Avatar.jsx";
import PostCard from "../components/PostCard.jsx";
import sharePost from "../utils/sharePost.js";

const PAGE_SIZE = 20;


export default function HomeFeed({ posts, setPosts, me, onAvatarClick, p2p }) {
  const [feedTab,     setFeedTab]     = useState("foryou");
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [following,   setFollowing]   = useState([]);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [shareMsg,    setShareMsg]    = useState(false);

  // Sheets
  const [showReply,   setShowReply]   = useState(null);
  const [showRetweet, setShowRetweet] = useState(null);
  const [quoteText,   setQuoteText]   = useState("");

  const scrollRef    = useRef(null);
  const touchStartY  = useRef(0);
  const pullDistance = useRef(0);
  const allPostsRef  = useRef([]);   // full unfiltered list for pagination
  const [replyText,   setReplyText]   = useState("");
  const [newPostsCount, setNewPostsCount] = useState(0);
  const hadCacheOnMount = useRef(posts.length > 0);
  const seqLoadRef   = useRef(null);
  const pendingNewIdsRef = useRef(new Set());
  const currentTabRef = useRef("foryou"); // track tab for background refresh

  // ── Fetch the right feed based on current tab ──────────────────────────
  const fetchFeedForTab = async (tab) => {
    if (!p2p) return { posts: [] };

    // Always fetch following list for the UI
    const followRes = await p2p.getFollowing().catch(() => ({ users: [] }));
    const followingIds = (followRes.users || []).map(u => u.userId);
    setFollowing(followingIds);

    let feedRes;
    if (tab === "foryou" && p2p.getForYouFeed) {
      // For You: trending feed from node with engagement scoring
      feedRes = await p2p.getForYouFeed({ limit: 100 });
    } else if (tab === "following" && p2p.getTrendingFollowingFeed) {
      // Following: same algorithm scoped to followed users
      feedRes = await p2p.getTrendingFollowingFeed({ limit: 100 });
    } else {
      // Fallback: use the classic feed endpoint
      feedRes = await p2p.getFeed({ limit: 100 });
    }

    const now = Date.now();
    const validPosts = (feedRes.posts || []).filter(p => !p.expiresAt || p.expiresAt > now);
    const patched = me ? validPosts.map(p =>
      p.authorId === me.userId
        ? { ...p, authorAvatar: me.avatar, authorName: me.name }
        : p
    ) : validPosts;

    return { posts: patched, followingIds };
  };

  // ── Load feed (full reload — pull-to-refresh, logo tap, first load, tab switch) ──
  const loadFeed = async (resetVisible = true) => {
    if (!p2p) return;
    try {
      const tab = feedTab;
      currentTabRef.current = tab;
      const { posts: feedPosts, followingIds } = await fetchFeedForTab(tab);

      allPostsRef.current = feedPosts;
      setFollowing(followingIds);

      if (resetVisible) {
        setPosts(feedPosts.slice(0, PAGE_SIZE));
        startSequentialLoad(feedPosts);
      }
    } catch(e) { console.error("[HomeFeed] load failed:", e); }
    setLoading(false);
  };

  // ── Sequential background loading — adds posts one by one after initial batch ──
  const startSequentialLoad = (allPosts) => {
    if (seqLoadRef.current) { clearTimeout(seqLoadRef.current); seqLoadRef.current = null; }
    let idx = PAGE_SIZE;
    const maxPosts = Math.min(allPosts.length, 100);
    const loadOne = () => {
      if (idx >= maxPosts) { seqLoadRef.current = null; return; }
      const post = allPosts[idx];
      idx++;
      seqLoadRef.current = setTimeout(loadOne, 200);
      setPosts(prev => {
        if (prev.some(p => p.id === post.id)) return prev;
        return [...prev, post];
      });
    };
    seqLoadRef.current = setTimeout(loadOne, 1000);
  };

  // ── Background check for new posts (non-destructive — only sets banner) ──
  const checkForNewPosts = async () => {
    if (!p2p) return;
    try {
      const tab = currentTabRef.current;
      const { posts: freshPosts } = await fetchFeedForTab(tab);

      const existingIds = new Set(allPostsRef.current.map(p => p.id));
      const fresh = freshPosts.filter(p => {
        if (existingIds.has(p.id) || pendingNewIdsRef.current.has(p.id)) return false;
        // Media posts (image/video) must have media downloaded before showing notification
        if ((p.type === 'image' || p.type === 'video') && !p.image && !p.video) return false;
        return true;
      });
      if (fresh.length > 0) {
        fresh.forEach(p => pendingNewIdsRef.current.add(p.id));
        setNewPostsCount(pendingNewIdsRef.current.size);
      }
    } catch(_) {}
  };

  // ── Load new posts from banner tap (prepends to existing list) ──
  const loadNewPosts = async () => {
    if (pendingNewIdsRef.current.size === 0) return;
    const fetchIds = new Set(pendingNewIdsRef.current);
    setNewPostsCount(0);
    pendingNewIdsRef.current = new Set();
    if (!p2p) return;
    try {
      const tab = currentTabRef.current;
      const { posts: freshPosts } = await fetchFeedForTab(tab);
      const fresh = freshPosts.filter(p => {
        if (!fetchIds.has(p.id)) return false;
        // Media posts must have media available
        if ((p.type === 'image' || p.type === 'video') && !p.image && !p.video) return false;
        return true;
      });
      if (fresh.length > 0) {
        const patched = me ? fresh.map(p =>
          p.authorId === me.userId
            ? { ...p, authorAvatar: me.avatar, authorName: me.name }
            : p
        ) : fresh;
        allPostsRef.current = [...patched, ...allPostsRef.current];
        setPosts(prev => {
          const visibleIds = new Set(prev.map(p => p.id));
          const actualNew = patched.filter(p => !visibleIds.has(p.id));
          return actualNew.length > 0 ? [...actualNew, ...prev].slice(0, 100) : prev;
        });
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch(_) {}
  };

  // ── Tab switch — reload feed with the correct algorithm ─────────────────
  const handleTabSwitch = (newTab) => {
    if (newTab === feedTab) return;
    setFeedTab(newTab);
    currentTabRef.current = newTab;
    setPosts([]);
    allPostsRef.current = [];
    if (seqLoadRef.current) { clearTimeout(seqLoadRef.current); seqLoadRef.current = null; }
    pendingNewIdsRef.current = new Set();
    setNewPostsCount(0);
    setLoading(true);
    // Load feed for the new tab
    (async () => {
      try {
        const { posts: feedPosts, followingIds } = await fetchFeedForTab(newTab);
        allPostsRef.current = feedPosts;
        setFollowing(followingIds);
        setPosts(feedPosts.slice(0, PAGE_SIZE));
        startSequentialLoad(feedPosts);
      } catch(e) { console.error("[HomeFeed] tab switch failed:", e); }
      setLoading(false);
    })();
  };

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hadCacheOnMount.current) {
      // Cached content exists — show immediately, don't reload
      allPostsRef.current = [...posts];
      setLoading(false);
      p2p?.getFollowing?.().then(r => setFollowing((r.users || []).map(u => u.userId))).catch(() => {});
      const delay = setTimeout(checkForNewPosts, 3000);
      const interval = setInterval(checkForNewPosts, 30000);
      return () => { clearTimeout(delay); clearInterval(interval); if (seqLoadRef.current) clearTimeout(seqLoadRef.current); };
    } else {
      // No cache — full load with sequential rendering
      setLoading(true);
      loadFeed(true);
      const interval = setInterval(checkForNewPosts, 30000);
      return () => { clearInterval(interval); if (seqLoadRef.current) clearTimeout(seqLoadRef.current); };
    }
  }, [p2p]);

  // Keep allPostsRef in sync with external posts changes (e.g., after compose)
  useEffect(() => {
    if (posts.length === 0) return;
    const existingIds = new Set(allPostsRef.current.map(p => p.id));
    const newInPosts = posts.filter(p => !existingIds.has(p.id));
    if (newInPosts.length > 0) {
      allPostsRef.current = [...newInPosts, ...allPostsRef.current];
    }
  }, [posts]);

  // ── Logo tap — scroll to top + refresh ────────────────────────────────────
  const handleLogoTap = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    loadFeed();
  };

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = async () => { setRefreshing(true); setNewPostsCount(0); pendingNewIdsRef.current = new Set(); await loadFeed(true); setRefreshing(false); };
  const onTouchStart = (e) => { if (scrollRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e) => {
    if (touchStartY.current > 0 && scrollRef.current?.scrollTop === 0) {
      const dist = e.touches[0].clientY - touchStartY.current;
      if (dist > 0) pullDistance.current = Math.min(dist, 150);
    }
  };
  const onTouchEnd = () => { if (pullDistance.current > 80) handleRefresh(); touchStartY.current = 0; pullDistance.current = 0; };

  // ── Lazy load on scroll ────────────────────────────────────────────────────
  const onScroll = useCallback((e) => {
    if (loadingMore) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      const source = allPostsRef.current;
      const currentCount = posts.length;
      if (currentCount >= source.length) return;
      setLoadingMore(true);
      const nextSlice = source.slice(currentCount, currentCount + PAGE_SIZE);
      setPosts(prev => [...prev, ...nextSlice]);
      setLoadingMore(false);
    }
  }, [loadingMore, posts.length]);

  // ── Post actions ───────────────────────────────────────────────────────────
  const toggle = (id, field) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const was = p[field];
      if (field === "liked")      was ? p2p?.unlikePost({ postId:id }) : p2p?.likePost({ postId:id });
      if (field === "disliked")   was ? p2p?.undislikePost?.({ postId:id }) : p2p?.dislikePost?.({ postId:id });
      if (field === "bookmarked") p2p?.bookmarkPost({ postId:id });
      return { ...p, [field]:!was,
        likes:    field==="liked"     ? (p.likes||0)    + (was?-1:1) : p.likes,
        dislikes: field==="disliked"  ? (p.dislikes||0) + (was?-1:1) : p.dislikes,
        retweets: field==="retweeted" ? (p.retweets||0) + (was?-1:1) : p.retweets,
      };
    }));
    // Also update allPostsRef
    allPostsRef.current = allPostsRef.current.map(p => {
      if (p.id !== id) return p;
      return { ...p, [field]: !p[field] };
    });
  };

  const handleDelete = async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    allPostsRef.current = allPostsRef.current.filter(p => p.id !== postId);
    try { await p2p?.deletePost?.({ postId }); } catch(_) {}
  };

  // Retweet popup
  const handleRetweetTap = (post) => { setShowRetweet(typeof post === 'object' ? post : null); setQuoteText(""); };
  const doRetweet = async () => {
    if (!showRetweet || !p2p) return;
    await p2p.retweetPost({ postId: showRetweet.id });
    toggle(showRetweet.id, "retweeted");
    setShowRetweet(null);
  };
  const doQuote = async () => {
    if (!showRetweet || !quoteText.trim() || !p2p) return;
    await p2p.createPost({ text: quoteText.trim() + "\n\n↩ @" + showRetweet.authorHandle + ": " + (showRetweet.text||"").slice(0,80) });
    setShowRetweet(null);
    loadFeed(true);
  };

  const handleShare = async (post) => {
    const result = await sharePost(post);
    if (result === "copied") { setShareMsg(true); setTimeout(() => setShareMsg(false), 2000); }
  };

  // ── Visible posts — no client-side filter needed, server handles it ──
  const visiblePosts = posts;

  const isEmpty = !loading && visiblePosts.length === 0;

  return (
    <div ref={scrollRef} onScroll={onScroll}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ flex:1, overflowY:"auto", overflowX:"hidden", position:"relative" }}>

      {refreshing && (
        <div style={{ padding:12, textAlign:"center", background:C.surface, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ color:C.accent, fontSize:13 }}>Refreshing…</span>
        </div>
      )}

      {/* Sticky header */}
      <div style={{ position:"sticky", top:0, zIndex:20, background:C.bg, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", padding:"10px 14px 0" }}>
          <div style={{ width:32 }}/>
          <div style={{ flex:1 }}/>
          <div style={{ width:32 }}/>
        </div>
        <div style={{ display:"flex" }}>
          {[["foryou","For You"],["following","Following"]].map(([id, label]) => (
            <button key={id} onClick={() => handleTabSwitch(id)} style={{
              flex:1, background:"none", border:"none", cursor:"pointer",
              padding:"13px 0 11px", color:feedTab===id ? C.text : C.muted,
              fontWeight:feedTab===id ? 700 : 400, fontSize:15,
              position:"relative", WebkitTapHighlightColor:"transparent",
            }}>
              {label}
              {feedTab===id && <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:54, height:3, background:C.accent, borderRadius:2 }}/>}
            </button>
          ))}
        </div>
      </div>

      {/* New posts banner (X/Twitter style) */}
      {newPostsCount > 0 && (
        <button onClick={loadNewPosts} style={{
          width:"100%", padding:"12px 16px",
          background:`linear-gradient(90deg,${C.accentDark},${C.accent})`,
          border:"none", borderBottom:`1px solid ${C.border}`,
          color:"#000", fontWeight:700, fontSize:14,
          cursor:"pointer", textAlign:"center",
          WebkitTapHighlightColor:"transparent",
        }}>
          See {newPostsCount} new post{newPostsCount > 1 ? "s" : ""}
        </button>
      )}

      {/* Loading (first load) — shows cached posts underneath spinner */}
      {loading && posts.length === 0 && (
        <div style={{ padding:48, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
          <EchoLogo size={36}/>
          <p style={{ color:C.muted, fontSize:14, margin:0 }}>Connecting to peers…</p>
        </div>
      )}

      {isEmpty && feedTab==="foryou"     && <div style={{ padding:48, textAlign:"center" }}><p style={{ color:C.muted, fontSize:15 }}>No trending posts yet.</p><p style={{ color:C.muted, fontSize:13, marginTop:6 }}>Posts with engagement will appear here.</p></div>}
      {isEmpty && feedTab==="following"  && <div style={{ padding:48, textAlign:"center" }}><p style={{ color:C.muted, fontSize:15 }}>Nothing from people you follow yet.</p></div>}

      {visiblePosts.map(p => (
        <PostCard key={p.id} post={p}
          onLike={id => toggle(id, "liked")}
          onDislike={id => toggle(id, "disliked")}
          onRetweet={() => handleRetweetTap(p)}
          onBookmark={id => toggle(id, "bookmarked")}
          onDelete={handleDelete}
          onReply={post => { setShowReply(post); setReplyText(""); }}
          onShare={handleShare}
          muted={globalMuted}
          onToggleMute={() => setGlobalMuted(m => !m)}
        />
      ))}

      {loadingMore && <div style={{ padding:16, textAlign:"center", color:C.muted, fontSize:13 }}>Loading more…</div>}

      {/* Share toast */}
      {shareMsg && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:"10px 20px", color:C.text, fontSize:14, zIndex:200, whiteSpace:"nowrap" }}>
          Link copied to clipboard
        </div>
      )}

      {/* ── Retweet sheet ── */}
      {showRetweet && (
        <>
          <div onClick={() => setShowRetweet(null)} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.6)" }}/>
          <div onClick={e => e.stopPropagation()} style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:101, background:C.card, borderRadius:"20px 20px 0 0", padding:"0 24px", paddingBottom:"max(32px,env(safe-area-inset-bottom))" }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div style={{ width:36, height:4, borderRadius:2, background:C.border }}/></div>
            {/* Original post preview */}
            <div style={{ background:C.surface, borderRadius:10, padding:12, marginBottom:14, border:`1px solid ${C.border}` }}>
              <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>@{showRetweet.authorHandle}</div>
              <div style={{ color:C.text, fontSize:14, lineHeight:1.4 }}>{(showRetweet.text||"").slice(0,120)}{(showRetweet.text||"").length>120?"…":""}</div>
            </div>
            {/* Repost */}
            <button onClick={doRetweet} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"12px 0", WebkitTapHighlightColor:"transparent" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              <div style={{ textAlign:"left" }}>
                <div style={{ color:C.text, fontSize:16, fontWeight:700 }}>Repost</div>
                <div style={{ color:C.muted, fontSize:12 }}>Share without comment</div>
              </div>
            </button>
            {/* Quote */}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:4 }}>
              <div style={{ color:C.muted, fontSize:13, marginBottom:8 }}>Quote with comment</div>
              <textarea value={quoteText} onChange={e => setQuoteText(e.target.value)} placeholder="Add a comment…" rows={3}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:15, resize:"none", outline:"none", boxSizing:"border-box" }}/>
              <button onClick={doQuote} disabled={!quoteText.trim()}
                style={{ width:"100%", background: quoteText.trim() ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface, border:"none", borderRadius:24, padding:"12px 0", color: quoteText.trim() ? "#000" : C.muted, fontWeight:800, fontSize:15, cursor: quoteText.trim() ? "pointer" : "default", marginTop:10 }}>
                Quote
              </button>
            </div>
            <button onClick={() => setShowRetweet(null)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 0", color:C.muted, fontSize:16, marginTop:4 }}>Cancel</button>
          </div>
        </>
      )}

      {/* ── Reply sheet ── */}
      {showReply && (
        <>
          <div onClick={() => setShowReply(null)} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.7)" }}/>
          <div onClick={e => e.stopPropagation()} style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:101, background:C.card, borderRadius:"20px 20px 0 0", padding:"0 24px", paddingBottom:"max(32px,env(safe-area-inset-bottom))" }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div style={{ width:36, height:4, borderRadius:2, background:C.border }}/></div>
            <h3 style={{ color:C.text, fontWeight:700, fontSize:16, margin:"0 0 10px" }}>Reply to @{showReply.authorHandle}</h3>
            {showReply.text && <p style={{ color:C.muted, fontSize:14, margin:"0 0 12px", lineHeight:1.4, borderLeft:`3px solid ${C.border}`, paddingLeft:10 }}>{showReply.text.slice(0,100)}{showReply.text.length>100?"…":""}</p>}
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply…" rows={4}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:12, color:C.text, fontSize:15, resize:"none", outline:"none", boxSizing:"border-box" }}/>
            <button onClick={async () => {
              const text = replyText.trim();
              if (!text || !p2p) return;
              await p2p.replyToPost({ postId: showReply.id, text });
              setReplyText("");
              setShowReply(null);
              loadFeed(true);
            }} style={{ width:"100%", background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, border:"none", borderRadius:24, padding:"14px 0", color:"#000", fontWeight:800, fontSize:16, cursor:"pointer", marginTop:14 }}>
              Reply
            </button>
          </div>
        </>
      )}
    </div>
  );
}
