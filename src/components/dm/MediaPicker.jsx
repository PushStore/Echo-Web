// File: src/components/dm/MediaPicker.jsx
import { useRef } from "react";
import { C } from "../../theme.js";

/**
 * Dual-mode media picker:
 *
 * mode="overlay" (default): Full-screen image/video pick + preview sheets (legacy)
 * mode="inline":          Renders horizontal icon buttons for the Session-style
 *                         attachment bar. Each icon is a circle with an SVG + label.
 *
 * Props:
 * mode              "overlay" | "inline"
 * showPicker        boolean  (overlay mode) — show the "pick media type" sheet
 * onClose()         fn       (overlay mode) — close the sheet
 * onPick(type)      fn       (inline mode) — called AFTER file is picked
 * onSendFile(dataUrl, fileName, fileSize, fileType) fn — called when a generic file is picked
 *
 * + image/video preview props (both modes use same overlay for previews)
 */
export default function MediaPicker({
  mode = "overlay",
  showPicker,
  onClose,
  onPick,
  onSendFile,
  selectedImage,
  imageCaption,
  sendingImage,
  onSetImageCaption,
  onSendImage,
  onClearImage,
  selectedVideo,
  videoCaption,
  sendingVideo,
  onSetVideoCaption,
  onSendVideo,
  onClearVideo,
}) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Helpers ───────────────────────────────────────────────────
  const pickImage = async (source) => {
    try {
      const { Camera, CameraSource, CameraResultType } = await import("../../capacitor-camera-shim.js");
      const result = await Camera.getPhoto({
        quality: 80, allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      });
      return result.dataUrl;
    } catch { return null; }
  };

  const dispatchMediaPicked = (dataUrl, type, thumbnail) => {
    window.dispatchEvent(new CustomEvent("echo:mediaPicked", { detail: { dataUrl, type, thumbnail } }));
    onPick?.(type);
  };

  const handleCameraCapture = async () => {
    const dataUrl = await pickImage("camera");
    if (dataUrl) dispatchMediaPicked(dataUrl, "image");
  };

  const handleGalleryImage = async () => {
    const dataUrl = await pickImage("gallery");
    if (dataUrl) {
      dispatchMediaPicked(dataUrl, "image");
    } else {
      imageInputRef.current?.click();
    }
  };

  const handleVideoSelect = () => {
    videoInputRef.current?.click();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const onFileImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => dispatchMediaPicked(reader.result, "image");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onFileVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = ["video/mp4", "video/webm", "video/quicktime"];
    if (!valid.includes(file.type)) { alert("Please select MP4, WebM, or MOV"); e.target.value = ""; return; }
    if (file.size > 250 * 1024 * 1024) { alert("Max video size is 250 MB"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const thumbnail = await generateVideoThumbnail(file);
      dispatchMediaPicked(dataUrl, "video", thumbnail);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Generic file handler — converts to data URL and sends via onSendFile
  const onFileGeneric = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250 * 1024 * 1024) { alert("Max file size is 250 MB"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (file.type.startsWith("image/")) {
        dispatchMediaPicked(reader.result, "image");
      } else if (file.type.startsWith("video/")) {
        (async () => {
          const thumbnail = await generateVideoThumbnail(file);
          dispatchMediaPicked(reader.result, "video", thumbnail);
        })();
      } else {
        // Generic file — pass to onSendFile for proper handling
        onSendFile?.(reader.result, file.name, formatFileSize(file.size), file.type || "application/octet-stream");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const generateVideoThumbnail = (file) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.currentTime = 1;
      video.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 180;
        canvas.getContext("2d").drawImage(video, 0, 0, 320, 180);
        URL.revokeObjectURL(video.src);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      });
      video.addEventListener("error", () => { URL.revokeObjectURL(video.src); resolve(null); });
    });

  // ── Inline mode: horizontal attachment buttons ────────────────
  // FIX #2: No voice button — voice is press-and-hold on mic button only
  // FIX #3: No cancel button — + button toggles open/close
  if (mode === "inline") {
    return (
      <>
        <input ref={imageInputRef} type="file" accept="image/" style={{ display: "none" }} onChange={(e) => { onFileImage(e); onPick?.("image"); }} />
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: "none" }} onChange={onFileVideo} />
        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={onFileGeneric} />

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {/* Picture / Gallery */}
          <button onClick={handleGalleryImage} style={inlineBtnStyle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={inlineLabelStyle}>Picture</span>
          </button>

          {/* Video */}
          <button onClick={handleVideoSelect} style={inlineBtnStyle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            <span style={inlineLabelStyle}>Video</span>
          </button>

          {/* Camera */}
          <button onClick={handleCameraCapture} style={inlineBtnStyle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={inlineLabelStyle}>Camera</span>
          </button>

          {/* File */}
          <button onClick={handleFileSelect} style={inlineBtnStyle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            <span style={inlineLabelStyle}>File</span>
          </button>
        </div>
      </>
    );
  }

  // ── Overlay mode: full-sheet picker + preview overlays ────────
  const overlay = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,.8)",
    display: "flex", alignItems: "flex-end", justifyContent: "center"
  };
  const sheet = {
    background: C.card, borderRadius: "20px 20px 0 0",
    padding: "24px 16px", width: "100%", maxWidth: 500
  };

  return (
    <>
      <input ref={imageInputRef} type="file" accept="image/" style={{ display: "none" }} onChange={onFileImage} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: "none" }} onChange={onFileVideo} />
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={onFileGeneric} />

      {/* ── Media type picker sheet ── */}
      {showPicker && !selectedImage && !selectedVideo && (
        <div style={overlay}>
          <div style={sheet}>
            <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 16px", textAlign: "center" }}>Select Media</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button style={gridBtn(C.gradient)} onClick={() => { onClose(); handleCameraCapture(); }}>
                <CameraIco />Take Photo
              </button>
              <button style={gridBtn(C.bgSecondary)} onClick={() => { onClose(); handleGalleryImage(); }}>
                <GalleryIco />Gallery
              </button>
              <button style={gridBtn(C.bgSecondary)} onClick={() => { onClose(); handleVideoSelect(); }}>
                <VideoIco />Video
              </button>
              <button style={gridBtn(C.bgSecondary)} onClick={() => { onClose(); handleFileSelect(); }}>
                <FileIco />File
              </button>
            </div>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Image preview ── */}
      {selectedImage && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1001,
          background: "rgba(0,0,0,.95)",
          display: "flex", flexDirection: "column", justifyContent: "space-between"
        }}>
          <button onClick={onClearImage} style={closeBtnStyle}>&#10005;</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <img src={selectedImage.dataUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 12 }} />
          </div>
          {/* FIX #8: Bottom safe area for media preview */}
          <div style={{ padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))", background: C.card, borderTop: `1px solid ${C.border}` }}>
            <input type="text" value={imageCaption} onChange={(e) => onSetImageCaption(e.target.value)} placeholder="Add a caption..."
              style={captionInputStyle} />
            <button onClick={onSendImage} disabled={sendingImage}
              style={{ ...sendBtnStyle, background: sendingImage ? C.border : C.accent, color: sendingImage ? C.muted : "#000", cursor: sendingImage ? "not-allowed" : "pointer" }}
            >{sendingImage ? "Sending..." : "Send Photo"}</button>
          </div>
        </div>
      )}

      {/* ── Video preview ── */}
      {selectedVideo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1001,
          background: "rgba(0,0,0,.95)",
          display: "flex", flexDirection: "column", justifyContent: "space-between"
        }}>
          <button onClick={onClearVideo} style={closeBtnStyle}>&#10005;</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            {selectedVideo.thumbnail && <img src={selectedVideo.thumbnail} alt="Video thumbnail" style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 12 }} />}
          </div>
          <div style={{ padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))", background: C.card, borderTop: `1px solid ${C.border}` }}>
            <input type="text" value={videoCaption} onChange={(e) => onSetVideoCaption(e.target.value)} placeholder="Add a caption..."
              style={captionInputStyle} />
            <button onClick={onSendVideo} disabled={sendingVideo}
              style={{ ...sendBtnStyle, background: sendingVideo ? C.border : C.accent, color: sendingVideo ? C.muted : "#000", cursor: sendingVideo ? "not-allowed" : "pointer" }}
            >{sendingVideo ? "Sending..." : "Send Video"}</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared style constants ───────────────────────────────────────
const inlineBtnStyle = {
  background: "none", border: "none", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "6px 8px",
};

const inlineLabelStyle = {
  color: "#71767b", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
};

const closeBtnStyle = {
  alignSelf: "flex-end", margin: 16,
  background: "rgba(255,255,255,.2)", border: "none",
  borderRadius: "50%", width: 40, height: 40,
  fontSize: 20, color: "#fff", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const captionInputStyle = {
  width: "100%", background: C.bgSecondary, border: "none",
  borderRadius: 12, padding: "12px 16px", color: C.text,
  fontSize: 15, marginBottom: 12, boxSizing: "border-box",
};

const sendBtnStyle = {
  width: "100%", border: "none", borderRadius: 12,
  padding: 14, fontSize: 16, fontWeight: 700,
};

const gridBtn = (bg) => ({
  background: bg, color: bg === C.gradient ? "#000" : C.text,
  border: "none", borderRadius: 16, padding: 16,
  fontSize: 15, fontWeight: 700, cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
});

const cancelBtnStyle = {
  width: "100%", marginTop: 16, background: "transparent",
  color: C.muted, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
};

// ── Inline SVG icon components ───────────────────────────────────
const CameraIco = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);
const GalleryIco = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);
const VideoIco = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);
const FileIco = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
