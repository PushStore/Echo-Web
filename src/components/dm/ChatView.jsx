// File: src/components/dm/ChatView.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../../theme.js";
import MessageBubble from "./MessageBubble.jsx";
import MediaPicker from "./MediaPicker.jsx";
import VoiceRecorder from "./VoiceRecorder.jsx";
import useMessageSending from "../../hooks/useMessageSending.js";

// ── SVG Icons (inline, no external deps) ──────────────────────────────────────
const IcoPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoMic = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IcoSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);
const IcoArrowLeft = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function ChatView({ conversation, onBack, p2p }) {
  const [messages,      setMessages]      = useState([]);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [messageSelectMode, setMessageSelectMode] = useState(false);
  const [selectedMessages,  setSelectedMessages]  = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const attachmentMenuRef = useRef(null);

  // ── Load messages (defined before hooks that depend on it) ─────
  const loadMessages = useCallback(async () => {
    try {
      const result = await p2p.getMessages({
        conversationId: conversation?.conversationId,
        limit: 50
      });
      const msgs = result.messages || [];
      setMessages([...msgs].reverse());
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, [conversation?.conversationId, p2p]);

  // ── Message sending hook (must be before useEffects that reference its state) ──
  const {
    messageText, setMessageText, sending,
    selectedImage, setSelectedImage,
    imageCaption, setImageCaption,
    sendingImage,
    selectedVideo, setSelectedVideo,
    videoCaption, setVideoCaption,
    sendingVideo,
    showVoice, setShowVoice,
    hasText,
    handleSendText, handleSendImage, handleSendVideo,
    handleSendAudio, handleSendFile, handleMicDown,
  } = useMessageSending({
    otherUserId: conversation?.otherUserId,
    conversationId: conversation?.conversationId,
    p2p, loadMessages,
  });

  // FIX #6: Notify App.js that a DM chat is open so hardware back button closes chat first
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.__echoChatOpen = true;
    window.__echoChatOnBack = () => {
      // FIX #6: Close media viewer FIRST if open (before leaving chat)
      if (window.__echoMediaViewerOpen && window.__echoMediaViewerOnBack) {
        window.__echoMediaViewerOnBack();
        return true; // consumed — stay in chat
      }
      // Close any open overlays first
      if (showAttachmentMenu) { setShowAttachmentMenu(false); return true; }
      if (selectedImage || selectedVideo) {
        setSelectedImage(null); setSelectedVideo(null); setImageCaption(""); setVideoCaption("");
        return true;
      }
      if (showVoice) { setShowVoice(false); return true; }
      onBack();
      return true; // consumed
    };
    const handler = (e) => {
      if (window.__echoChatOpen && window.__echoChatOnBack) {
        e.preventDefault();
        window.__echoChatOnBack();
      }
    };
    let removeCapListener = null;
    (async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        const listener = await CapApp.addListener("backButton", handler);
        removeCapListener = () => listener.remove();
      } catch {}
    })();
    window.addEventListener("popstate", handler);
    return () => {
      window.__echoChatOpen = false;
      window.__echoChatOnBack = null;
      removeCapListener?.();
      window.removeEventListener("popstate", handler);
    };
  }, [onBack, showAttachmentMenu, selectedImage, selectedVideo, showVoice]);

  // ── Close attachment menu on outside tap ─────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target)) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showAttachmentMenu]);

  // Check if user is near the bottom of the chat (within 150px)
  const checkNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  useEffect(() => { if (conversation?.otherUserId) loadMessages(); }, [conversation?.otherUserId, loadMessages]);

  // Poll every 2 seconds as fallback
  useEffect(() => {
    const id = setInterval(loadMessages, 2000);
    return () => clearInterval(id);
  }, [loadMessages]);

  // Scroll to bottom when messages change — only if user is already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Listen for real-time DM push events from native layer
  useEffect(() => {
    const handlerEcho = (e) => {
      const convId = e.detail?.conversationId || e.conversationId;
      if (!convId || convId === conversation?.conversationId) loadMessages();
    };
    const handlerDm = () => loadMessages();

    window.addEventListener("echo:dmReceived", handlerEcho);
    window.addEventListener("dmReceived", handlerDm);
    return () => {
      window.removeEventListener("echo:dmReceived", handlerEcho);
      window.removeEventListener("dmReceived", handlerDm);
    };
  }, [conversation?.conversationId, loadMessages]);

  // ── Message select ────────────────────────────────────────────
  const toggleMessageSelect = (msgId) => {
    setSelectedMessages(prev => { const next = new Set(prev); next.has(msgId) ? next.delete(msgId) : next.add(msgId); return next; });
  };
  const exitMessageSelectMode = () => { setMessageSelectMode(false); setSelectedMessages(new Set()); };
  const confirmDeleteMessages = async () => {
    try { for (const id of selectedMessages) await p2p.deleteMessage({ messageId: id }); await loadMessages(); }
    catch (err) { alert("Delete failed: " + err.message); }
    finally { setShowDeleteConfirm(false); exitMessageSelectMode(); }
  };

  const displayName = conversation?.otherUserName?.trim() || conversation?.otherUserDisplayName?.trim() || conversation?.otherUserId?.slice(0, 14) + "\u2026";
  const displayHandle = conversation?.otherUserHandle?.trim() ? "@" + conversation.otherUserHandle : null;

  // Guard
  if (!conversation?.otherUserId) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", width: "100%", position: "absolute", top: 0, background: "#000" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.text, cursor: "pointer", padding: 4, display: "flex" }}><IcoArrowLeft /></button>
        </div>
        <p style={{ color: C.muted, fontSize: 15, marginTop: 60 }}>Conversation not available</p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "#000", height: "100%", position: "relative",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "12px 12px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 10,
        background: "#000", zIndex: 10,
      }}>
        <button
          onClick={messageSelectMode ? exitMessageSelectMode : onBack}
          style={{ background: "none", border: "none", color: C.text, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
        ><IcoArrowLeft /></button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {messageSelectMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{selectedMessages.size} selected</span>
              <button onClick={() => setSelectedMessages(new Set(messages.map(m => m.id)))}
                style={{ background: "#1a1a1a", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "5px 10px", borderRadius: 6 }}>All</button>
            </div>
          ) : (
            <>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</h2>
              {displayHandle && <p style={{ color: C.muted, fontSize: 12, margin: "1px 0 0" }}>{displayHandle}</p>}
            </>
          )}
        </div>

        {messageSelectMode ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteConfirm(true)} disabled={selectedMessages.size === 0}
              style={{ background: selectedMessages.size > 0 ? "#ff3b30" : C.border, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: selectedMessages.size > 0 ? "pointer" : "not-allowed" }}>Delete</button>
            <button onClick={exitMessageSelectMode}
              style={{ background: "#1a1a1a", color: C.text, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setMessageSelectMode(true)}
            style={{ background: "none", color: C.muted, border: "none", cursor: "pointer", padding: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={() => { isNearBottomRef.current = checkNearBottom(); }}
        style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 48 }}>
            <p style={{ fontSize: 15 }}>No messages yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Say hello</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              messageSelectMode={messageSelectMode}
              selectedMessages={selectedMessages}
              onLongPress={(id) => { setMessageSelectMode(true); setSelectedMessages(new Set([id])); }}
              onToggleSelect={toggleMessageSelect}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Session-style Input Bar ────────────────────────────── */}
      <div style={{ background: "#000", position: "relative", zIndex: 5 }}>

        {/* Attachment menu with cancel button */}
        {showAttachmentMenu && !selectedImage && !selectedVideo && !showVoice && (
          <div
            ref={attachmentMenuRef}
            style={{
              display: "flex", flexDirection: "column", gap: 0, alignItems: "stretch",
              background: "#111",
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
              border: `1px solid ${C.border}`,
              borderBottom: "none",
            }}
          >
            <div style={{
              display: "flex", gap: 16, alignItems: "center",
              padding: "14px 20px",
            }}>
              <MediaPicker
                mode="inline"
                onPick={(type) => setShowAttachmentMenu(false)}
                onSendFile={(...args) => { setShowAttachmentMenu(false); handleSendFile(...args); }}
              />
            </div>
            {/* Cancel button to close the popup */}
            <button
              onClick={() => setShowAttachmentMenu(false)}
              style={{
                width: "100%",
                background: "transparent", color: C.muted,
                border: "none", borderTop: `1px solid ${C.border}`,
                borderRadius: 0, padding: "10px 0", fontSize: 14, fontWeight: 600,
                cursor: "pointer",
              }}
            >Cancel</button>
          </div>
        )}

        {/* Main input row */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          padding: "10px 12px",
          borderTop: showAttachmentMenu ? "none" : `1px solid ${C.border}`,
          background: "#000",
        }}>
          {/* FIX #3: + button toggles attachment menu (no separate cancel) */}
          <button
            onClick={() => setShowAttachmentMenu(v => !v)}
            style={{
              background: "#1a1a1a", color: C.accent, border: "none",
              borderRadius: "50%", width: 40, height: 40,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "transform .15s",
              transform: showAttachmentMenu ? "rotate(45deg)" : "rotate(0deg)",
            }}
          ><IcoPlus /></button>

          {/* Text input or Voice recorder */}
          {showVoice ? (
            <VoiceRecorder
              onSendAudio={handleSendAudio}
              onStarted={() => setShowAttachmentMenu(false)}
              onCancelled={() => setShowVoice(false)}
            />
          ) : (
            <>
              {/* FIX #7: Textarea with proper safe area handling */}
              <textarea
                value={messageText}
                onInput={(e) => setMessageText(e.target.value)}
                placeholder="Message"
                rows={1}
                style={{
                  flex: 1, background: "#1a1a1a", border: "none",
                  borderRadius: 22, padding: "10px 18px",
                  color: C.text, fontSize: 15, resize: "none",
                  outline: "none", maxHeight: 100, fontFamily: "inherit",
                  lineHeight: 1.4,
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              />
              {/* FIX #2: Mic button — tap or press-and-hold to record (WhatsApp/Session style) */}
              {hasText ? (
                <button
                  onClick={handleSendText}
                  disabled={sending}
                  style={{
                    background: C.accent, color: "#000",
                    border: "none", borderRadius: "50%",
                    width: 40, height: 40,
                    cursor: sending ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background .2s, color .2s",
                  }}
                >
                  {sending ? <span style={{ fontSize: 16 }}>&#8230;</span> : <IcoSend />}
                </button>
              ) : (
                <button
                  onClick={handleMicDown}
                  style={{
                    background: "#1a1a1a", color: C.muted,
                    border: "none", borderRadius: "50%",
                    width: 40, height: 40,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background .2s, color .2s",
                    WebkitTouchCallout: "none", userSelect: "none",
                  }}
                ><IcoMic /></button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MediaPicker: image/video preview overlays ── */}
      <MediaPicker
        showPicker={false}
        selectedImage={selectedImage}
        imageCaption={imageCaption}
        sendingImage={sendingImage}
        onSetImageCaption={setImageCaption}
        onSendImage={handleSendImage}
        onClearImage={() => { setSelectedImage(null); setImageCaption(""); }}
        selectedVideo={selectedVideo}
        videoCaption={videoCaption}
        sendingVideo={sendingVideo}
        onSetVideoCaption={setVideoCaption}
        onSendVideo={handleSendVideo}
        onClearVideo={() => { setSelectedVideo(null); setVideoCaption(""); }}
      />

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#111", borderRadius: 20, padding: 24, maxWidth: 300, width: "100%", textAlign: "center" }}>
            <h3 style={{ color: C.text, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Delete {selectedMessages.size} message{selectedMessages.size !== 1 ? "s" : ""}?
            </h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Removed from your device only.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, background: "#1a1a1a", color: C.text, border: "none", borderRadius: 12, padding: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmDeleteMessages} style={{ flex: 1, background: "#ff3b30", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
