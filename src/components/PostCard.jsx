import { useRef, useState, useEffect } from "react";
import { C, fmt, Btn, IcoThumbUp, IcoThumbDown, IcoRetweet, IcoComment, IcoShare, IcoBookmark, IcoBar, IcoEye } from "../theme.js";
import Avatar from "./Avatar.jsx";
import { resolveVideoUrl } from "../services/videoBlobCache.js";

export default function PostCard({ post, onLike, onDislike, onRetweet, onBookmark, onDelete, onReply, onShare, muted = false, onToggleMute }) {
  const vref      = useRef(null);
  const wrapRef   = useRef(null);
  const blobUrlRef = useRef(null);  // track blob URL for cleanup
  const [playing,    setPlaying]    = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [inView,     setInView]     = useState(false);  // card is near viewport
  const [canPlay,    setCanPlay]    = useState(false);  // video buffered enough for smooth play
  const [thumbReady, setThumbReady] = useState(false);  // true once video metadata loaded
  const [thumbSrc,   setThumbSrc]   = useState(null);   // canvas-extracted first frame
  const [resolvedSrc, setResolvedSrc] = useState(null);  // blob URL or original URL from cache

  // Intersection observer: detect when card enters viewport (generous rootMargin for preloading)
  useEffect(() => {
    if (!post.video || !wrapRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
    }, { rootMargin: "200px 0px", threshold: 0 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [post.video]);

  // Resolve video source through blob cache when card enters viewport
  useEffect(() => {
    const rawUrl = post.video;
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
  }, [inView, post.video]);

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
    if (!post.video || !wrapRef.current || !canPlay || !resolvedSrc) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!vref.current) return;
      if (e.isIntersecting && e.intersectionRatio >= 0.6)
        vref.current.play().then(() => setPlaying(true)).catch(() => {});
      else { vref.current.pause(); setPlaying(false); }
    }, { threshold: 0.6 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [post.video, canPlay, resolvedSrc]);

  // Detect when video has buffered enough to play smoothly
  useEffect(() => {
    const el = vref.current;
    if (!el || !resolvedSrc) return;
    const onReady = () => setCanPlay(true);
    const onError = () => setCanPlay(false);
    el.addEventListener("canplay", onReady);
    el.addEventListener("error", onError);
    if (el.readyState >= 3) setCanPlay(true);
    return () => {
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("error", onError);
    };
  }, [resolvedSrc]);

  // Sync muted state
  useEffect(() => {
    if (vref.current) vref.current.muted = muted;
  }, [muted]);

  // Extract first-frame thumbnail from video via canvas (only when in view)
  useEffect(() => {
    const src = resolvedSrc || post.video;
    if (!src || !inView) return;
    // If post already has a thumbnail field, use it directly
    if (post.thumbnail) { setThumbSrc(post.thumbnail); setThumbReady(true); return; }

    let vid = null;
    try {
      vid = document.createElement("video");
      vid.src        = src;
      vid.muted      = true;
      vid.playsInline = true;
      vid.preload    = "metadata";
      vid.currentTime = 0.5; // seek slightly in so frame is visible
      vid.addEventListener("seeked", () => {
        try {
          const canvas  = document.createElement("canvas");
          canvas.width  = vid.videoWidth  || 360;
          canvas.height = vid.videoHeight || 640;
          canvas.getContext("2d").drawImage(vid, 0, 0, canvas.width, canvas.height);
          setThumbSrc(canvas.toDataURL("image/jpeg", 0.7));
          setThumbReady(true);
        } catch(_) {
          setThumbReady(true); // show dark placeholder if canvas fails (cross-origin)
        }
        // Clean up — remove temporary video element from DOM to prevent memory leak
        vid.removeAttribute("src");
        vid.load();
      }, { once: true });
      vid.addEventListener("error", () => {
        setThumbReady(true);
        vid.removeAttribute("src");
      }, { once: true });
      vid.load();
    } catch(_) { setThumbReady(true); }

    return () => {
      if (vid) {
        vid.removeAttribute("src");
        vid = null;
      }
    };
  }, [resolvedSrc, post.video, post.thumbnail, inView]);

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
    <div style={{ borderBottom:"1px solid #2a2a2a", padding:"14px 14px 10px", position:"relative" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <Avatar src={post.authorAvatar} seed={post.authorId} size={42}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontWeight:700, color:C.text, fontSize:14.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {post.authorName}
            </span>
            <span style={{ color:C.muted, fontSize:13, flexShrink:0 }}>· {ago(post.timestamp)}</span>
            {post.isMine && (
              <span style={{ color:C.accent, fontSize:11, background:"rgba(110,231,183,0.1)", borderRadius:8, padding:"1px 6px" }}>You</span>
            )}
          </div>
          <div style={{ color:C.muted, fontSize:12.5 }}>@{post.authorHandle}</div>
        </div>
        {/* Views count — left of three dots */}
        <div style={{ display:"flex", alignItems:"center", gap:4, color:C.muted, fontSize:13, marginRight:2 }}>
          <IcoEye size={15}/>
          <span>{fmt(post.views || 0)}</span>
        </div>
        <button
          onClick={() => setShowMenu(true)}
          style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:20, padding:"4px 8px", WebkitTapHighlightColor:"transparent", lineHeight:1 }}
        >···</button>
      </div>

      {/* Text */}
      {post.text && (
        <p style={{ color:C.text, fontSize:15, lineHeight:1.55, margin:"0 0 10px", wordBreak:"break-word" }}>
          {post.text}
        </p>
      )}

      {/* Image */}
      {post.image && (
        <div style={{ margin:"0 -14px 10px" }}>
          <img src={post.image} style={{ width:"100%", maxHeight:400, objectFit:"cover", display:"block", borderRadius:16 }} alt=""/>
        </div>
      )}

      {/* Video — 9:16 portrait, with rounded corners (Thread-style) */}
      {post.video && (
        <div style={{ margin:"0 -14px 10px", display:"flex", background:C.bg }}>
          <div style={{ width:3, background:C.bg, borderRadius:"16px 0 0 16px", flexShrink:0 }}/>
          <div
            ref={wrapRef}
            onClick={togglePlay}
            style={{ flex:1, position:"relative", background:"#000", cursor:"pointer", overflow:"hidden" }}
          >
          {/* 9:16 aspect ratio box */}
          <div style={{ paddingTop:"177.78%", position:"relative" }}>

            {/* Thumbnail — always visible as base layer, fades out when video plays */}
            {thumbReady && thumbSrc && (
              <img
                src={thumbSrc}
                alt=""
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
                muted={muted}
                preload="auto"
                style={{
                  position:"absolute", inset:0, width:"100%", height:"100%",
                  objectFit:"cover", display:"block",
                  borderRadius:16,
                  opacity: (playing && canPlay) ? 1 : 0,
                  transition:"opacity 0.35s ease",
                }}
              />
            )}

            {/* Play button overlay — shows when paused */}
            {!playing && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
            )}

            {/* Mute toggle */}
            <button
              onClick={e => { e.stopPropagation(); onToggleMute?.(); }}
              style={{ position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,.55)", border:"none", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}
            >
              {muted
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                  </svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 010 7.07"/>
                  </svg>
              }
            </button>
          </div>
        </div>
          <div style={{ width:3, background:C.bg, borderRadius:"0 16px 16px 0", flexShrink:0 }}/>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:2 }}>
        <Btn icon={<IcoComment/>} count={post.replies || 0} color={C.muted} onClick={() => onReply?.(post)}/>
        <Btn icon={<IcoRetweet on={post.retweeted}/>} count={post.retweets || 0} color={post.retweeted ? C.green : C.muted} onClick={() => onRetweet(post.id)}/>
        <Btn icon={<IcoThumbDown on={post.disliked}/>} count={post.dislikes || 0} color={post.disliked ? C.blue : C.muted} onClick={() => onDislike?.(post.id)}/>
        <Btn icon={<IcoThumbUp on={post.liked}/>} count={post.likes || 0} color={post.liked ? C.danger : C.muted} onClick={() => onLike(post.id)}/>
        <div style={{ display:"flex", gap:14 }}>
          <Btn icon={<IcoBookmark on={post.bookmarked}/>} onClick={() => onBookmark(post.id)}/>
          <Btn icon={<IcoShare/>} onClick={() => onShare?.(post)}/>
        </div>
      </div>

      {/* ··· Bottom sheet menu */}
      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.5)" }}/>
          <div style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:101, background:C.card, borderRadius:"20px 20px 0 0", paddingBottom:"max(20px, env(safe-area-inset-bottom))" }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:C.border }}/>
            </div>

            {/* Delete — own posts only */}
            {post.isMine && (
              <button onClick={() => { setShowMenu(false); onDelete?.(post.id); }}
                style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", WebkitTapHighlightColor:"transparent" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
                <span style={{ color:C.danger, fontSize:16, fontWeight:600 }}>Delete Echo</span>
              </button>
            )}

            {/* Copy text */}
            {post.text && (
              <button onClick={() => { setShowMenu(false); navigator.clipboard?.writeText(post.text); }}
                style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", WebkitTapHighlightColor:"transparent" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <span style={{ color:C.text, fontSize:16 }}>Copy text</span>
              </button>
            )}

            {/* Not interested — other people's posts */}
            {!post.isMine && (
              <button onClick={() => setShowMenu(false)}
                style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", WebkitTapHighlightColor:"transparent" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                <span style={{ color:C.muted, fontSize:16 }}>Not interested</span>
              </button>
            )}

            <button onClick={() => setShowMenu(false)}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 20px", color:C.muted, fontSize:16, textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
