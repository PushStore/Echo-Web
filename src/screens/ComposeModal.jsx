// File: src/screens/ComposeModal.jsx
import { useState, useRef, useEffect } from "react";
import { C } from "../theme.js";
import Avatar from "../components/Avatar.jsx";

// ── Media size limits (in bytes) ─────────────────────────────────────────────
// Images are sent as base64 data URLs (~33% overhead), so the raw limit is lower.
// Videos are the most common crash cause — 4min 1080p can be 200-500MB.
// Mother Ship's media.maxSizeBytes config defaults to 50MB; we match that for web.
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;   // 20 MB raw file size
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;   // 50 MB raw file size

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ── Video thumbnail extractor (client-side, before upload) ───────────────────
function extractVideoThumbnail(dataUrl) {
  return new Promise((resolve) => {
    const vid = document.createElement("video");
    vid.src = dataUrl;
    vid.muted = true;
    vid.playsInline = true;
    vid.currentTime = 0.5;
    vid.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = Math.min(vid.videoWidth,  480);
        canvas.height = Math.round(vid.videoHeight * (canvas.width / vid.videoWidth));
        canvas.getContext("2d").drawImage(vid, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } catch { resolve(null); }
    }, { once: true });
    vid.addEventListener("error", () => resolve(null), { once: true });
    vid.load();
  });
}

// ── Media picker ──────────────────────────────────────────────────────────────
const pickMedia = async (source) => {
  try {
    const { Camera, CameraSource, CameraResultType } = await import("../capacitor-camera-shim.js");
    const result = await Camera.getPhoto({
      quality: 90, allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });
    return { dataUrl: result.dataUrl, type: "image" };
  } catch { return null; }
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoImage  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcoVideo  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
const IcoCamera = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IcoClose  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoAlert  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

export default function ComposeModal({ me, onClose, p2p, onPosted }) {
  const [text,         setText]         = useState("");
  const [media,        setMedia]        = useState(null);   // { dataUrl, type, thumbnail, fileSize }
  const [thumbLoading, setThumbLoading] = useState(false);
  const [posting,      setPosting]      = useState(false);
  const [posted,       setPosted]       = useState(false);
  const [storageType,  setStorageType]  = useState("p2p");
  const [mediaError,   setMediaError]   = useState("");     // size validation error

  const fileInputRef  = useRef(null);
  const videoInputRef = useRef(null);
  const canPost = (text.trim() || media) && !posting && !posted && !mediaError;

  // Fetch storage preference
  useEffect(() => {
    if (p2p) {
      p2p.getStoragePreference?.().then(pref => {
        if (pref?.storageType) setStorageType(pref.storageType)
      }).catch(() => {})
    }
  }, [p2p])

  // ── Post ───────────────────────────────────────────────────────────────────
  const doPost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const payload = { text: text.trim() };
      if (media?.type === "image") payload.image = media.dataUrl;
      if (media?.type === "video") payload.video = media.dataUrl;
      await p2p?.createPost(payload);
      setPosted(true);
      await onPosted?.();
      setTimeout(onClose, 700);
    } catch(e) {
      alert("Failed to post: " + (e.message || "Unknown error"));
      setPosting(false);
    }
  };

  // ── Validate file size before processing ────────────────────────────────────
  const validateMediaSize = (file, mediaType) => {
    const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
    if (file.size > maxSize) {
      const error = `${mediaType === "image" ? "Image" : "Video"} is too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(maxSize)}. Please compress or trim it.`;
      setMediaError(error);
      setMedia(null);
      return false;
    }
    setMediaError("");
    return true;
  };

  // ── Set video with thumbnail ───────────────────────────────────────────────
  const setVideoMedia = async (dataUrl, fileSize) => {
    setThumbLoading(true);
    setMedia({ dataUrl, type: "video", thumbnail: null, fileSize });
    const thumbnail = await extractVideoThumbnail(dataUrl);
    setMedia({ dataUrl, type: "video", thumbnail, fileSize });
    setThumbLoading(false);
  };

  // ── Pickers ───────────────────────────────────────────────────────────────
  const handleCamera       = async () => { const r = await pickMedia("camera");  if (r) setMedia(r); };
  const handleGalleryImage = async () => { const r = await pickMedia("gallery"); if (r) { setMedia(r); return; } fileInputRef.current?.click(); };
  const handleGalleryVideo = () => videoInputRef.current?.click();

  const onFileImage = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!validateMediaSize(file, "image")) { e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setMedia({ dataUrl: reader.result, type: "image", fileSize: file.size });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onFileVideo = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!validateMediaSize(file, "video")) { e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setVideoMedia(reader.result, file.size);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <input ref={fileInputRef}  type="file" accept="image/*" style={{ display:"none" }} onChange={onFileImage}/>
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={onFileVideo}/>

      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.6)" }}/>

      <div style={{
        position:"fixed", left:0, right:0, bottom:0, zIndex:101,
        background:C.card, borderRadius:"20px 20px 0 0",
        padding:"16px 16px 0", paddingBottom:"max(24px,env(safe-area-inset-bottom))",
        maxHeight:"85vh", display:"flex", flexDirection:"column",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.text, fontSize:15, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={doPost} disabled={!canPost}
            style={{ background: canPost ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface, border:"none", color: canPost ? "#000" : C.muted, borderRadius:20, padding:"9px 22px", fontWeight:800, fontSize:15, cursor: canPost ? "pointer" : "default" }}>
            {posted ? "Posted!" : posting ? "Sending..." : "Echo"}
          </button>
        </div>

        {/* Compose area */}
        <div style={{ display:"flex", gap:12, flex:1, overflowY:"auto" }}>
          <Avatar src={me.avatar} seed={me.userId || me.handle} size={42}/>
          <div style={{ flex:1 }}>
            <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
              placeholder="What's your echo?"
              style={{ width:"100%", background:"none", border:"none", outline:"none", color:C.text, fontSize:17, resize:"none", minHeight:90, lineHeight:1.55, boxSizing:"border-box" }}
            />

            {/* Media size error */}
            {mediaError && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginTop:8, marginBottom:8, padding:10, background:`${C.danger}15`, borderRadius:8, border:`1px solid ${C.danger}40` }}>
                <IcoAlert/>
                <span style={{ color:C.danger, fontSize:12, lineHeight:1.5, flex:1 }}>{mediaError}</span>
                <button onClick={() => setMediaError("")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, opacity:0.7 }}>
                  <IcoClose/>
                </button>
              </div>
            )}

            {/* Media preview — shows thumbnail for video while it loads */}
            {media && (
              <div style={{ position:"relative", marginTop:8, marginBottom:8, borderRadius:12, overflow:"hidden" }}>
                {media.type === "image" ? (
                  <img src={media.dataUrl} style={{ width:"100%", maxHeight:220, objectFit:"cover", display:"block", borderRadius:12 }} alt=""/>
                ) : (
                  <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#000" }}>
                    {/* Show thumbnail while video loads, play icon overlay */}
                    {media.thumbnail && (
                      <img src={media.thumbnail}
                        style={{ width:"100%", maxHeight:220, objectFit:"cover", display:"block" }} alt=""/>
                    )}
                    {!media.thumbnail && !thumbLoading && (
                      <video src={media.dataUrl} controls style={{ width:"100%", maxHeight:220, borderRadius:12, display:"block" }}/>
                    )}
                    {thumbLoading && (
                      <div style={{ height:120, display:"flex", alignItems:"center", justifyContent:"center", background:"#111" }}>
                        <span style={{ color:C.muted, fontSize:13 }}>Generating thumbnail...</span>
                      </div>
                    )}
                    {media.thumbnail && (
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                        <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* File size indicator for media */}
                {media.fileSize && (
                  <div style={{ position:"absolute", bottom:8, left:8, background:"rgba(0,0,0,.65)", borderRadius:6, padding:"2px 8px" }}>
                    <span style={{ color:"#fff", fontSize:11, fontWeight:600 }}>{formatFileSize(media.fileSize)}</span>
                  </div>
                )}
                <button onClick={() => { setMedia(null); setMediaError(""); }} style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.65)", border:"none", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  <IcoClose/>
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ height:1, background:C.border, margin:"12px 0 10px" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:54, paddingBottom:8 }}>
          <button onClick={handleGalleryImage} disabled={!!media} style={{ background:"none", border:"none", cursor: media ? "default" : "pointer", opacity: media ? 0.35 : 1, padding:6, borderRadius:8 }} title="Image (max 20 MB)"><IcoImage/></button>
          <button onClick={handleGalleryVideo} disabled={!!media} style={{ background:"none", border:"none", cursor: media ? "default" : "pointer", opacity: media ? 0.35 : 1, padding:6, borderRadius:8 }} title="Video (max 50 MB)"><IcoVideo/></button>
          <button onClick={handleCamera}       disabled={!!media} style={{ background:"none", border:"none", cursor: media ? "default" : "pointer", opacity: media ? 0.35 : 1, padding:6, borderRadius:8 }}><IcoCamera/></button>
          <div style={{ flex:1 }}/>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: storageType === "gdrive" ? C.blue : storageType === "web3" ? "#a855f7" : C.accent }}/>
            <span style={{ color: storageType === "gdrive" ? C.blue : storageType === "web3" ? "#a855f7" : C.accent, fontSize:11 }}>
              {storageType === "gdrive" ? "Drive" : storageType === "web3" ? "IPFS" : "P2P"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
