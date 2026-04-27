// File: src/screens/StoryCamera.jsx
import { useState, useRef } from "react";
import { C } from "../theme.js";

const STORY_TYPES = ["Normal", "Close Friends"];
const VIDEO_DURATIONS = [15, 30, 60];

export default function StoryCamera({ p2p, onClose, onPosted }) {
  const [media,       setMedia]       = useState(null);   // { dataUrl, type }
  const [mediaType,   setMediaType]   = useState("image");
  const [caption,     setCaption]     = useState("");
  const [type,        setType]        = useState("Normal");
  const [videoDuration, setVideoDuration] = useState(30);
  const [posting,     setPosting]     = useState(false);
  const [posted,      setPosted]      = useState(false);

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // ── Pick image ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("../capacitor-camera-shim.js");
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl, source: CameraSource.Photos,
        quality: 80, allowEditing: false,
      });
      setMedia({ dataUrl: photo.dataUrl, type: "image" });
      setMediaType("image");
    } catch {
      fileInputRef.current?.click();
    }
  };

  const pickVideo = () => videoInputRef.current?.click();

  const onFileImage = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setMedia({ dataUrl: reader.result, type: "image" }); setMediaType("image"); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onFileVideo = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setMedia({ dataUrl: reader.result, type: "video" }); setMediaType("video"); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Post story ─────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!p2p) return;
    setPosting(true);
    try {
      await p2p.storyPost?.({
        mediaUrl: media?.dataUrl,
        mediaType: media?.type || mediaType,
        caption: caption.trim(),
        type,
        duration: mediaType === "video" ? videoDuration : undefined,
      });
      setPosted(true);
      await onPosted?.();
      setTimeout(onClose, 700);
    } catch (e) {
      alert("Failed to post story: " + (e.message || "Unknown error"));
      setPosting(false);
    }
  };

  const canPost = !posting && !posted;

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileImage}/>
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={onFileVideo}/>

      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.6)" }}/>

      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 101,
        background: C.card, borderRadius: "20px 20px 0 0",
        padding: "16px 20px 0", paddingBottom: "max(32px, env(safe-area-inset-bottom))",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}/>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <span style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>Create Story</span>
          <button onClick={handlePost} disabled={!canPost} style={{
            background: canPost ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
            border: "none", borderRadius: 20, padding: "9px 22px",
            color: canPost ? "#000" : C.muted, fontWeight: 800, fontSize: 15, cursor: canPost ? "pointer" : "default",
          }}>
            {posted ? "Posted! ✓" : posting ? "…" : "Post"}
          </button>
        </div>

        {/* Media preview or picker buttons */}
        {media ? (
          <div style={{ marginBottom: 14, position: "relative", borderRadius: 14, overflow: "hidden" }}>
            {media.type === "image" ? (
              <img src={media.dataUrl} style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} alt=""/>
            ) : (
              <video src={media.dataUrl} controls style={{ width: "100%", maxHeight: 240, display: "block" }}/>
            )}
            <button onClick={() => setMedia(null)} style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,.65)", border: "none",
              borderRadius: "50%", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button onClick={pickImage} style={{
              flex: 1, background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "20px 0", color: C.text, fontSize: 14,
              fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              Photo
            </button>
            <button onClick={pickVideo} style={{
              flex: 1, background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "20px 0", color: C.text, fontSize: 14,
              fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              Video
            </button>
          </div>
        )}

        {/* Caption */}
        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption…"
          rows={2} style={{
            width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 14,
            resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 12, lineHeight: 1.5,
          }}/>

        {/* Story type */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Audience</div>
          <div style={{ display: "flex", gap: 8 }}>
            {STORY_TYPES.map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex: 1, background: type === t ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
                border: type === t ? "none" : `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 0",
                color: type === t ? "#000" : C.text,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {t === "Close Friends" ? "🤫 " : "🌍 "}{t}
              </button>
            ))}
          </div>
        </div>

        {/* Video duration (only for video) */}
        {mediaType === "video" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Video Duration</div>
            <div style={{ display: "flex", gap: 6 }}>
              {VIDEO_DURATIONS.map(d => (
                <button key={d} onClick={() => setVideoDuration(d)} style={{
                  flex: 1, background: videoDuration === d ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
                  border: videoDuration === d ? "none" : `1px solid ${C.border}`,
                  borderRadius: 10, padding: "8px 0",
                  color: videoDuration === d ? "#000" : C.text,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
