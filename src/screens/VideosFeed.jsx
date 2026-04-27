import { useRef, useState, useEffect } from "react";
import { C, fmt, IcoHeart, IcoComment } from "../theme.js";
import EchoLogo from "../components/EchoLogo.jsx";
import Avatar from "../components/Avatar.jsx";
import { resolveVideoUrl } from "../services/videoBlobCache.js";

// ── Video cache ──────────────────────────────────────────────────────────────
const VIDEO_CACHE_KEY = "echo_videos_cache";
const saveVideoCache = (videos) => {
  try { localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(videos.slice(0, 50))); } catch(_) {}
};
const loadVideoCache = () => {
  try { return JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || "[]"); } catch(_) { return []; }
};

// ── Single video card in the feed ──────────────────────────────────────────────
function VideoCard({ vid, onLike, globalMuted, setGlobalMuted }) {
  const vref      = useRef(null);
  const wrapRef   = useRef(null);
  const blobUrlRef = useRef(null);  // track blob URL for cleanup
  const [playing,      setPlaying]      = useState(false);
  const [inView,       setInView]       = useState(false);   // card is near viewport
  const [canPlay,      setCanPlay]      = useState(false);   // video has enough data to play smoothly
  const [thumbReady,   setThumbReady]   = useState(false);
  const [thumbSrc,     setThumbSrc]     = useState(null);
  const [resolvedSrc,  setResolvedSrc]  = useState(null);   // blob URL or original URL from cache

  // Intersection observer: detect when card enters viewport (lower threshold for preloading)
  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
    }, { rootMargin: "200px 0px", threshold: 0 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  // Resolve video source through blob cache when card enters viewport
  useEffect(() => {
    const rawUrl = vid.videoUrl || vid.video;
    if (!inView || !rawUrl) { setResolvedSrc(null); return; }

    // Already a local reference — no caching needed
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) {
      setResolvedSrc(rawUrl);
      return;
    }

    let cancelled = false;
    resolveVideoUrl(rawUrl).then((src) => {
      if (cancelled || !src) return;
      // Revoke previous blob URL to prevent memory leak
      if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = src;
      setResolvedSrc(src);
    });

    return () => { cancelled = true; };
  }, [inView, vid.videoUrl, vid.video]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Auto-play/pause when ≥60% visible — but only after canPlay and resolvedSrc
  useEffect(() => {
    if (!wrapRef.current || !canPlay || !resolvedSrc) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!vref.current) return;
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        vref.current.play().then(() => setPlaying(true)).catch(() => {});
      } else {
        vref.current.pause();
        setPlaying(false);
      }
    }, { threshold: 0.6 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [canPlay, resolvedSrc]);

  // Detect when video has buffered enough to play without stuttering
  useEffect(() => {
    const el = vref.current;
    if (!el || !resolvedSrc) return;
    const onReady = () => setCanPlay(true);
    const onError = () => setCanPlay(false);
    el.addEventListener("canplay", onReady);
    el.addEventListener("error", onError);
    // If already has enough data
    if (el.readyState >= 3) setCanPlay(true);
    return () => {
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("error", onError);
    };
  }, [resolvedSrc]);

  // Sync muted state
  useEffect(() => {
    if (vref.current) vref.current.muted = globalMuted;
  }, [globalMuted]);

  // Extract first-frame thumbnail (only when in view to save resources)
  useEffect(() => {
    const src = resolvedSrc || vid.videoUrl || vid.video;
    if (!src || !inView) return;
    if (vid.thumbnail) { setThumbSrc(vid.thumbnail); setThumbReady(true); return; }

    let tempVid = null;
    try {
      tempVid = document.createElement("video");
      tempVid.src = src;
      tempVid.muted = true;
      tempVid.playsInline = true;
      tempVid.preload = "metadata";
      tempVid.currentTime = 0.5;
      tempVid.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = tempVid.videoWidth || 360;
          canvas.height = tempVid.videoHeight || 640;
          canvas.getContext("2d").drawImage(tempVid, 0, 0, canvas.width, canvas.height);
          setThumbSrc(canvas.toDataURL("image/jpeg", 0.7));
          setThumbReady(true);
        } catch(_) { setThumbReady(true); }
        tempVid.removeAttribute("src");
        tempVid.load();
      }, { once: true });
      tempVid.addEventListener("error", () => {
        setThumbReady(true);
        tempVid.removeAttribute("src");
      }, { once: true });
      tempVid.load();
    } catch(_) { setThumbReady(true); }

    return () => {
      if (tempVid) { tempVid.removeAttribute("src"); tempVid = null; }
    };
  }, [resolvedSrc, vid.videoUrl, vid.video, vid.thumbnail, inView]);

  const togglePlay = () => {
    if (!vref.current) return;
    if (playing) { vref.current.pause(); setPlaying(false); }
    else         { vref.current.play();  setPlaying(true);  }
  };

  const ago = ts => {
    const d = Date.now() - ts;
    if (d < 60000)    return "now";
    if (d < 3600000)  return Math.floor(d / 60000) + "m";
    if (d < 86400000) return Math.floor(d / 3600000) + "h";
    return Math.floor(d / 86400000) + "d";
  };

  return (
    <div style={{ padding:"14px 14px 10px", borderBottom:`1px solid ${C.border}` }}>

      {/* Header: avatar + name + handle + time */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <Avatar src={vid.authorAvatar} seed={vid.authorId} size={42}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontWeight:700, color:C.text, fontSize:14.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {vid.authorName || "Unknown"}
            </span>
            <span style={{ color:C.muted, fontSize:13, flexShrink:0 }}>· {ago(vid.timestamp)}</span>
          </div>
          <div style={{ color:C.muted, fontSize:12.5 }}>@{vid.authorHandle || "unknown"}</div>
        </div>
      </div>

      {/* Text content */}
      {vid.text && (
        <p style={{ color:C.text, fontSize:15, lineHeight:1.55, margin:"0 0 10px", wordBreak:"break-word" }}>
          {vid.text}
        </p>
      )}

      {/* Video — same size as homepage (9:16, borderRadius:16, full bleed), buttons overlaid inside */}
      <div style={{ margin:"0 -14px 10px", display:"flex", background:C.bg }}>
        <div style={{ width:3, background:C.bg, borderRadius:"16px 0 0 16px", flexShrink:0 }}/>
        <div
          ref={wrapRef}
          onClick={togglePlay}
          style={{ flex:1, position:"relative", background:"#000", cursor:"pointer", overflow:"hidden" }}
        >
        {/* 9:16 aspect ratio */}
        <div style={{ paddingTop:"177.78%", position:"relative" }}>

          {/* Thumbnail — always visible as base layer, fades out when video plays */}
          {thumbReady && thumbSrc && (
            <img src={thumbSrc} alt=""
              style={{
                position:"absolute", inset:0, width:"100%", height:"100%",
                objectFit:"cover", display:"block", borderRadius:16,
                opacity: (playing && canPlay) ? 0 : 1,
                transition:"opacity 0.35s ease",
              }}
            />
          )}

          {/* Dark placeholder — only shows while thumbnail is loading */}
          {(!thumbReady || !thumbSrc) && (
            <div style={{
              position:"absolute", inset:0,
              background:"linear-gradient(160deg, #1c1c1c 0%, #0d0d0d 100%)",
              display:"flex", alignItems:"center", justifyContent:"center",
              borderRadius:16,
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </div>
          )}

          {/* Video element — only rendered when resolved source is available; fades in when ready */}
          {resolvedSrc && inView && (
            <video
              ref={vref}
              src={resolvedSrc}
              loop playsInline
              muted={globalMuted}
              preload="auto"
              style={{
                position:"absolute", inset:0, width:"100%", height:"100%",
                objectFit:"cover", display:"block", borderRadius:16,
                opacity: (playing && canPlay) ? 1 : 0,
                transition:"opacity 0.35s ease",
              }}
            />
          )}

          {/* Play button overlay */}
          {!playing && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
              <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          )}

          {/* Bottom gradient */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"50%", background:"linear-gradient(transparent, rgba(0,0,0,.75))", pointerEvents:"none", borderRadius:"0 0 16px 16px" }}/>

          {/* Right-side action buttons — overlaid INSIDE the video */}
          <div style={{ position:"absolute", right:10, bottom:16, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            {/* Like */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer" }} onClick={e => { e.stopPropagation(); onLike(vid.id); }}>
              <IcoHeart on={vid.liked} color={vid.liked ? C.danger : "white"} size={28}/>
              <span style={{ color:"white", fontSize:12, fontWeight:600 }}>{fmt(vid.likes)}</span>
            </div>
            {/* Comment */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <IcoComment color="white" size={26}/>
              <span style={{ color:"white", fontSize:12, fontWeight:600 }}>{fmt(vid.replies || 0)}</span>
            </div>
            {/* Mute toggle */}
            <button
              onClick={e => { e.stopPropagation(); setGlobalMuted(m => !m); }}
              style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}
            >
              {globalMuted
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                  </svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 010 7.07"/>
                  </svg>
              }
            </button>
          </div>

          {/* Bottom info overlay */}
          <div style={{ position:"absolute", bottom:16, left:14, right:70 }}>
            {vid.text && (
              <div style={{ color:"rgba(255,255,255,.9)", fontSize:13, lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {vid.text}
              </div>
            )}
          </div>
        </div>
        </div>
        <div style={{ width:3, background:C.bg, borderRadius:"0 16px 16px 0", flexShrink:0 }}/>
      </div>
    </div>
  );
}

// ── Videos Feed — scrollable feed of video cards, no header ────────────────────
export default function VideosFeed({ p2p, me, onCompose, isActive }) {
  const [videos,      setVideos]      = useState(() => loadVideoCache());
  const [loading,     setLoading]     = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [newVidsCount, setNewVidsCount] = useState(0);
  const [vidFeedTab,  setVidFeedTab]  = useState("all");

  const hadCache = useRef(videos.length > 0);
  const allVidsRef = useRef([]);
  const pendingVidIdsRef = useRef(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);
  const wasActiveRef = useRef(false);
  const [following, setFollowing] = useState([]);

  // ── Load videos (full reload) ────────────────────────────────────────────
  const loadVideos = async () => {
    if (!p2p) return;
    try {
      const [r, followRes] = await Promise.all([
        p2p.getFeed(),
        p2p.getFollowing().catch(() => ({ users: [] })),
      ]);
      const followingIds = (followRes.users || []).map(u => u.userId);
      setFollowing(followingIds);
      const vids = (r.posts||[]).filter(p => p.videoUrl||p.video||p.videoHash);
      const patched = me ? vids.map(v =>
        v.authorId === me.userId ? { ...v, authorAvatar: me.avatar, authorName: me.name } : v
      ) : vids;
      allVidsRef.current = patched;
      setVideos(patched);
      setLoading(false);
    } catch(e) { setLoading(false); }
  };

  // ── Background check for new videos ──────────────────────────────────────
  const checkForNewVideos = async () => {
    if (!p2p) return;
    try {
      const r = await p2p.getFeed();
      const vids = (r.posts||[]).filter(p => p.videoUrl||p.video||p.videoHash);
      const existingIds = new Set(allVidsRef.current.map(v => v.id));
      const fresh = vids.filter(v => !existingIds.has(v.id) && !pendingVidIdsRef.current.has(v.id));
      if (fresh.length > 0) {
        fresh.forEach(v => pendingVidIdsRef.current.add(v.id));
        setNewVidsCount(pendingVidIdsRef.current.size);
      }
    } catch(_) {}
  };

  // ── Load new videos from banner tap ──────────────────────────────────────
  const loadNewVideos = async () => {
    if (pendingVidIdsRef.current.size === 0) return;
    const fetchIds = new Set(pendingVidIdsRef.current);
    setNewVidsCount(0);
    pendingVidIdsRef.current = new Set();
    if (!p2p) return;
    try {
      const r = await p2p.getFeed();
      const vids = (r.posts||[]).filter(p => p.videoUrl||p.video||p.videoHash);
      const fresh = vids.filter(v => fetchIds.has(v.id));
      if (fresh.length > 0) {
        const patched = me ? fresh.map(v =>
          v.authorId === me.userId ? { ...v, authorAvatar: me.avatar, authorName: me.name } : v
        ) : fresh;
        allVidsRef.current = [...patched, ...allVidsRef.current];
        setVideos(prev => {
          const visibleIds = new Set(prev.map(v => v.id));
          const actualNew = patched.filter(v => !visibleIds.has(v.id));
          return actualNew.length > 0 ? [...actualNew, ...prev].slice(0, 50) : prev;
        });
      }
    } catch(_) {}
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!p2p) return;
    if (hadCache.current) {
      allVidsRef.current = [...videos];
      setLoading(false);
      const delay = setTimeout(checkForNewVideos, 3000);
      const interval = setInterval(checkForNewVideos, 30000);
      return () => { clearTimeout(delay); clearInterval(interval); };
    } else {
      setLoading(true);
      loadVideos();
      const interval = setInterval(checkForNewVideos, 30000);
      return () => clearInterval(interval);
    }
  }, [p2p]);

  // ── Save to cache whenever videos change ─────────────────────────────────
  useEffect(() => {
    if (videos.length > 0) saveVideoCache(videos);
  }, [videos]);

  // Keep allVidsRef in sync with external changes
  useEffect(() => {
    if (videos.length === 0) return;
    const existingIds = new Set(allVidsRef.current.map(v => v.id));
    const newInVids = videos.filter(v => !existingIds.has(v.id));
    if (newInVids.length > 0) {
      allVidsRef.current = [...newInVids, ...allVidsRef.current];
    }
  }, [videos]);

  const onLike = id => {
    setVideos(prev => prev.map(v =>
      v.id===id ? {...v, liked:!v.liked, likes:(v.likes||0)+(v.liked?-1:1)} : v
    ));
    // Persist the like to the backend
    const vid = allVidsRef.current.find(v => v.id === id);
    if (vid && p2p) {
      if (vid.liked) {
        p2p.unlikePost({ postId: id }).catch(() => {});
      } else {
        p2p.likePost({ postId: id }).catch(() => {});
      }
    }
    // Also update allVidsRef
    allVidsRef.current = allVidsRef.current.map(v =>
      v.id===id ? {...v, liked:!v.liked, likes:(v.likes||0)+(v.liked?-1:1)} : v
    );
  };

  // ── Pull-to-refresh handlers ──────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    setNewVidsCount(0);
    pendingVidIdsRef.current = new Set();
    await loadVideos();
    setRefreshing(false);
  };

  const onTouchStart = (e) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e) => {
    if (touchStartY.current > 0 && scrollRef.current?.scrollTop === 0) {
      const dist = e.touches[0].clientY - touchStartY.current;
      if (dist > 0) pullDistance.current = Math.min(dist, 150);
    }
  };

  const onTouchEnd = () => {
    if (pullDistance.current > 80) {
      handleRefresh();
    }
    touchStartY.current = 0;
    pullDistance.current = 0;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // ── Refresh when tab becomes active ────────────────────────────────────────
  useEffect(() => {
    if (isActive && wasActiveRef.current === false && videos.length > 0) {
      handleRefresh();
    }
    wasActiveRef.current = !!isActive;
  }, [isActive]);

  if (loading) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, flexDirection:"column", gap:16 }}>
        <EchoLogo size={40}/>
        <p style={{ color:C.muted, fontSize:14 }}>Loading videos...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, flexDirection:"column", gap:16 }}>
        <EchoLogo size={40}/>
        <p style={{ color:C.muted, fontSize:14, textAlign:"center", padding:"0 40px" }}>
          No video echoes yet.<br/>Follow people to see their videos.
        </p>
      </div>
    );
  }

  // Filter videos by tab
  const visibleVideos = vidFeedTab === "following"
    ? videos.filter(v => following.includes(v.authorId) || (me && v.authorId === me.userId))
    : videos;

  const isEmpty = visibleVideos.length === 0;

  return (
    <div ref={scrollRef} onScroll={() => {}}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ flex:1, overflowY:"auto", overflowX:"hidden", background:C.bg, position:"relative" }}>
      {/* Tab filter: All / Following */}
      <div style={{ position:"sticky", top:0, zIndex:20, background:C.bg, borderBottom:`1px solid ${C.border}`, display:"flex" }}>
        {["all","following"].map(tab => (
          <button key={tab} onClick={() => setVidFeedTab(tab)} style={{
            flex:1, background:"none", border:"none", cursor:"pointer",
            padding:"13px 0 11px", color:vidFeedTab===tab ? C.text : C.muted,
            fontWeight:vidFeedTab===tab ? 700 : 400, fontSize:15,
            position:"relative", WebkitTapHighlightColor:"transparent",
          }}>
            {tab === "all" ? "All" : "Following"}
            {vidFeedTab===tab && <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:54, height:3, background:C.accent, borderRadius:2 }}/>}
          </button>
        ))}
      </div>

      {/* New videos banner */}
      {newVidsCount > 0 && (
        <button onClick={loadNewVideos} style={{
          width:"100%", padding:"12px 16px",
          background:`linear-gradient(90deg,${C.accentDark},${C.accent})`,
          border:"none", borderBottom:`1px solid ${C.border}`,
          color:"#000", fontWeight:700, fontSize:14,
          cursor:"pointer", textAlign:"center",
          WebkitTapHighlightColor:"transparent",
        }}>
          See {newVidsCount} new video{newVidsCount > 1 ? "s" : ""}
        </button>
      )}

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div style={{ padding:12, textAlign:"center", background:C.surface, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ color:C.accent, fontSize:13 }}>Refreshing…</span>
        </div>
      )}

      {isEmpty && (
        <div style={{ padding:48, textAlign:"center" }}>
          <p style={{ color:C.muted, fontSize:15 }}>{vidFeedTab === "following" ? "No videos from people you follow yet." : "No video echoes yet."}</p>
          <p style={{ color:C.muted, fontSize:13, marginTop:6 }}>{vidFeedTab === "following" ? "Follow people to see their videos here." : "Follow people to see their videos."}</p>
        </div>
      )}

      {visibleVideos.map(v => (
        <VideoCard
          key={v.id}
          vid={v}
          onLike={onLike}
          globalMuted={globalMuted}
          setGlobalMuted={setGlobalMuted}
        />
      ))}

    </div>
  );
}
