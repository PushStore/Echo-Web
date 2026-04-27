// File: src/components/dm/MessageBubble.jsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { C } from "../../theme.js";

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const diff = Date.now() - date;
  if (diff < 60000)    return "Just now";
  if (diff < 3600000)  return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return date.toLocaleDateString();
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getFileExtension(fileName) {
  if (!fileName) return "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "";
}

function getFileIcon(fileName) {
  const ext = getFileExtension(fileName).toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "IMG";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "VID";
  if (["mp3", "aac", "wav", "ogg", "m4a"].includes(ext)) return "AUD";
  if (["pdf"].includes(ext)) return "PDF";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (["xls", "xlsx"].includes(ext)) return "XLS";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "ZIP";
  return "FILE";
}

/**
 * Deterministic waveform heights from msg.id (seeded LCG).
 */
function useDeterministicWaveform(msgId, bars = 30) {
  return useMemo(() => {
    let seed = 0;
    for (let i = 0; i < msgId.length; i++) {
      seed = ((seed * 31) + msgId.charCodeAt(i)) >>> 0;
    }
    return Array.from({ length: bars }, () => {
      seed = ((seed * 1664525) + 1013904223) >>> 0;
      return 6 + (seed % 14);
    });
  }, [msgId, bars]);
}

/**
 * Full-screen media viewer overlay — opens image/video/audio/file at original size.
 * FIX #6: Press any media to view it full-size on both sender and receiver sides.
 * FIX #6b: Hardware back button closes viewer first, not the chat.
 */
function MediaViewer({ msg, onClose }) {
  // FIX #6b: When viewer is open, intercept hardware back button to close viewer
  // NOTE: useEffect must be called before any early return (React Rules of Hooks)
  useEffect(() => {
    if (!msg) return;
    window.__echoMediaViewerOpen = true;
    window.__echoMediaViewerOnBack = () => {
      onClose();
      return true; // consumed
    };
    return () => {
      window.__echoMediaViewerOpen = false;
      window.__echoMediaViewerOnBack = null;
    };
  }, [msg, onClose]);

  if (!msg) return null;

  const isImage = msg.messageType === "image" && msg.imageData;
  const isVideo = msg.messageType === "video" && msg.videoData;
  const isAudio = msg.messageType === "audio" && msg.audioData;
  const isFile  = msg.messageType === "file" && msg.fileDataUrl;

  if (!isImage && !isVideo && !isAudio && !isFile) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(0,0,0,.95)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, boxSizing: "border-box",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 3001,
          background: "rgba(255,255,255,.15)", border: "none",
          borderRadius: "50%", width: 40, height: 40,
          color: "#fff", fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >&#10005;</button>

      {/* Image viewer */}
      {isImage && (
        <img
          src={msg.imageData}
          alt="Full size"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
        />
      )}

      {/* Video viewer */}
      {isVideo && (
        <video
          src={msg.videoData}
          poster={msg.videoThumbnail || undefined}
          controls
          playsInline
          autoPlay
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 8 }}
        />
      )}

      {/* Audio viewer */}
      {isAudio && (
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "#1a1a1a", borderRadius: 20, padding: 32, width: "85%", maxWidth: 360,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#127925;</div>
          <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Voice Note</p>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
            {formatDuration(msg.duration || 0)}
          </p>
          <audio
            src={msg.audioData}
            controls
            playsInline
            autoPlay
            style={{ width: "100%", borderRadius: 8 }}
          />
        </div>
      )}

      {/* File viewer — offer download */}
      {isFile && (
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "#1a1a1a", borderRadius: 20, padding: 32, width: "85%", maxWidth: 360,
          textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "rgba(255,255,255,.08)", margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: C.accent,
          }}>{getFileIcon(msg.fileName)}</div>
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, wordBreak: "break-all", marginBottom: 8 }}>
            {msg.fileName || "File"}
          </p>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
            {msg.fileSize || "Unknown size"} &middot; {getFileExtension(msg.fileName) || "File"}
          </p>
          <a
            href={msg.fileDataUrl}
            download={msg.fileName || "download"}
            style={{
              display: "inline-block", background: C.accent, color: "#000",
              border: "none", borderRadius: 12, padding: "14px 32px",
              fontSize: 15, fontWeight: 700, cursor: "pointer", textDecoration: "none",
            }}
          >Download</a>
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({
  msg,
  messageSelectMode,
  selectedMessages,
  onLongPress,
  onToggleSelect,
}) {
  const waveform = useDeterministicWaveform(msg.id);
  const isSelected = selectedMessages.has(msg.id);
  const [viewerOpen, setViewerOpen] = useState(false);

  const isMedia = msg.messageType === "image" || msg.messageType === "video";
  const isFile = msg.messageType === "file";
  const bubbleBg    = msg.isOutgoing ? C.accent    : C.bgSecondary;
  const bubbleColor = msg.isOutgoing ? "#000"      : C.text;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleMediaClick = useCallback((e) => {
    if (messageSelectMode) {
      onToggleSelect(msg.id);
      return;
    }
    // FIX #6: Open media viewer on click for all media types
    if (isMedia || isFile || (msg.messageType === "audio" && msg.audioData)) {
      e.stopPropagation();
      setViewerOpen(true);
    }
  }, [messageSelectMode, isMedia, isFile, msg]);

  return (
    <>
      <div
        onContextMenu={(e) => { e.preventDefault(); onLongPress(msg.id, e); }}
        onClick={() => messageSelectMode && onToggleSelect(msg.id)}
        style={{
          alignSelf:  msg.isOutgoing ? "flex-end" : "flex-start",
          maxWidth:   "78%",
          borderRadius: 18,
          background: bubbleBg,
          color:      bubbleColor,
          position:   "relative",
          border:     messageSelectMode && isSelected ? `3px solid ${C.accent}` : "none",
          opacity:    messageSelectMode && !isSelected ? 0.55 : 1,
          cursor:     messageSelectMode ? "pointer" : "default",
          transition: "opacity 0.15s",
          // FIX #1: overflow:hidden on bubble container so media never pops out
          overflow: "hidden",
        }}
      >
        {/* Selection checkbox */}
        {messageSelectMode && (
          <div style={{
            position: "absolute", top: -8, left: -8,
            background: isSelected ? C.accent : C.bgSecondary,
            border: `2px solid ${C.border}`,
            borderRadius: "50%", width: 24, height: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, zIndex: 10
          }}>
            {isSelected ? "✓" : ""}
          </div>
        )}

        {/* ── Audio label ── */}
        {msg.messageType === "audio" && (
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6, padding: "10px 14px 0" }}>
            Voice note
          </div>
        )}

        {/* ── Image ── Contained inside bubble with proper overflow ── */}
        {msg.messageType === "image" && msg.imageData && (
          <div
            onClick={handleMediaClick}
            style={{ padding: 3, cursor: "pointer", maxWidth: "100%" }}
          >
            <img
              src={msg.imageData}
              alt=""
              style={{
                maxWidth: "100%", maxHeight: 320,
                borderRadius: 14, objectFit: "cover", display: "block",
              }}
            />
          </div>
        )}

        {/* ── Video with thumbnail ── Proper containment + thumbnail ── */}
        {msg.messageType === "video" && msg.videoData && (
          <div
            onClick={handleMediaClick}
            style={{
              position: "relative",
              borderRadius: 14,
              overflow: "hidden",
              padding: 3,
              cursor: "pointer",
              maxWidth: "100%",
            }}
          >
            {/* Show thumbnail or poster frame */}
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", maxHeight: 200, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" }}>
              {msg.videoThumbnail ? (
                <img
                  src={msg.videoThumbnail}
                  alt="Video thumbnail"
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <video
                  src={msg.videoData}
                  playsInline
                  preload="metadata"
                  muted
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
              {/* Play overlay */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "rgba(0,0,0,.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                    <polygon points="8,5 20,12 8,19"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Video placeholder (no data yet) ── */}
        {msg.messageType === "video" && !msg.videoData && (
          <div style={{
            width: "100%", aspectRatio: "16/9", maxHeight: 200, borderRadius: 14,
            background: "rgba(255,255,255,.06)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            margin: 3,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(0,0,0,.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style={{ opacity: 0.7 }}>
                <polygon points="8,5 20,12 8,19"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Video</span>
          </div>
        )}

        {/* ── File card ── */}
        {msg.messageType === "file" && (
          <div
            onClick={handleMediaClick}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", minWidth: 220, cursor: "pointer",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: msg.isOutgoing ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, flexShrink: 0, color: bubbleColor,
            }}>
              {getFileIcon(msg.fileName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {/* Use fileName directly, or fall back to content (preview contains filename) */}
                {msg.fileName || (msg.content ? msg.content.replace(/^[\s\S]{0,2}/, "").trim() : "File")}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                {msg.fileSize || "Unknown size"}
                {msg.fileType ? ` \u00B7 ${msg.fileType}` : ""}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
        )}

        {/* ── Audio player ── */}
        {msg.messageType === "audio" && msg.audioData && (
          <div
            onClick={handleMediaClick}
            style={{
              background: msg.isOutgoing ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.08)",
              borderRadius: 12, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10, minWidth: 200,
              cursor: "pointer",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const audio = new Audio(msg.audioData);
                audio.play();
              }}
              style={{
                background: C.accent, border: "none", borderRadius: "50%",
                width: 36, height: 36, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", fontSize: 15, flexShrink: 0
              }}
            >&#9654;</button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}>
              {waveform.map((h, i) => (
                <div key={i} style={{
                  width: 3, height: h,
                  background: msg.isOutgoing ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.35)",
                  borderRadius: 2
                }} />
              ))}
            </div>
            <span style={{ fontSize: 12, opacity: 0.65, minWidth: 35, textAlign: "right" }}>
              {formatDuration(msg.duration || 0)}
            </span>
          </div>
        )}

        {/* ── Audio placeholder (no data yet) ── */}
        {msg.messageType === "audio" && !msg.audioData && (
          <div style={{
            background: msg.isOutgoing ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.08)",
            borderRadius: 12, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10, minWidth: 200
          }}>
            <div style={{
              background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
              width: 36, height: 36, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 15, flexShrink: 0
            }}>&#9654;</div>
            <span style={{ fontSize: 12, opacity: 0.6 }}>Voice note</span>
            <span style={{ fontSize: 12, opacity: 0.6, minWidth: 35, textAlign: "right" }}>
              {formatDuration(msg.duration || 0)}
            </span>
          </div>
        )}

        {/* ── Text content ── */}
        {msg.content && !isFile && (
          <div style={{
            padding: isMedia ? "6px 12px 4px" : "12px 16px",
            whiteSpace: "pre-wrap", wordBreak: "break-word"
          }}>
            {msg.content}
          </div>
        )}

        {/* ── File caption ── */}
        {isFile && msg.content && (
          <div style={{
            padding: "0 14px 10px",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontSize: 13, opacity: 0.7,
          }}>
            {msg.content}
          </div>
        )}

        {/* ── Footer: timestamp + delivery ── */}
        <div style={{
          fontSize: 11, opacity: 0.6,
          padding: isMedia && !msg.content ? "4px 12px 6px" : "2px 12px 6px",
          textAlign: msg.isOutgoing ? "right" : "left",
        }}>
          {formatTime(msg.timestamp)}
          {msg.isOutgoing && msg.deliveryStatus === "pending" && " \u00B7 Sending\u2026"}
          {msg.isOutgoing && msg.deliveryStatus === "sent"    && " \u00B7 Sent"}
          {msg.isOutgoing && msg.deliveryStatus === "delivered" && " \u00B7 Delivered"}
        </div>
      </div>

      {/* ── Media Viewer Overlay ── */}
      {viewerOpen && (
        <MediaViewer msg={msg} onClose={() => setViewerOpen(false)} />
      )}
    </>
  );
}
