import { useState, useEffect, useCallback } from "react";
import motherShip from "../mothership.js";

/**
 * Hook encapsulating all message-sending logic for the DM chat view.
 *
 * Handles sending text, images, video, audio, and files via p2p.sendMessage
 * with automatic MotherShip WebSocket fallback on failure. Also manages
 * the media picker event listener and attachment state.
 *
 * @param {Object} params
 * @param {string}   params.otherUserId       — Recipient's user ID
 * @param {string}   params.conversationId    — Conversation ID for DM routing
 * @param {Object}   params.p2p               — p2p bridge (sendMessage, deleteMessage)
 * @param {Function} params.loadMessages      — Callback to reload messages after send
 * @returns {Object} sending state + handler functions
 */
export default function useMessageSending({ otherUserId, conversationId, p2p, loadMessages }) {
  // ── Text input state ────────────────────────────────────────────
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // ── Image attachment state ──────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageCaption, setImageCaption] = useState("");
  const [sendingImage, setSendingImage] = useState(false);

  // ── Video attachment state ──────────────────────────────────────
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoCaption, setVideoCaption] = useState("");
  const [sendingVideo, setSendingVideo] = useState(false);

  // ── Voice recorder state ────────────────────────────────────────
  const [showVoice, setShowVoice] = useState(false);

  // ── MotherShip fallback helper ──────────────────────────────────
  const sendViaFallback = async (dataUrl, messageType) => {
    if (!motherShip.connected) return false;
    try {
      await motherShip.sendDm(otherUserId, dataUrl, messageType, conversationId);
      return true;
    } catch (msErr) {
      console.error("[ChatView] MotherShip fallback also failed:", msErr.message);
      return false;
    }
  };

  // ── Send text ───────────────────────────────────────────────────
  const handleSendText = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await p2p.sendMessage({ recipientId: otherUserId, text: messageText.trim() });
      setMessageText("");
      await loadMessages();
    } catch (err) {
      console.warn("[ChatView] sendMessage failed, trying MotherShip fallback:", err.message);
      const fallbackOk = await sendViaFallback(messageText.trim(), "text");
      if (fallbackOk) { setMessageText(""); await loadMessages(); }
      else alert("Failed to send: " + err.message);
    }
    finally { setSending(false); }
  };

  // ── Send image ──────────────────────────────────────────────────
  const handleSendImage = async () => {
    if (!selectedImage) return;
    setSendingImage(true);
    try {
      await p2p.sendMessage({ recipientId: otherUserId, image: selectedImage.dataUrl, text: imageCaption.trim() });
      setSelectedImage(null); setImageCaption(""); await loadMessages();
    } catch (err) {
      const fallbackOk = await sendViaFallback(selectedImage.dataUrl, "image");
      if (fallbackOk) { setSelectedImage(null); setImageCaption(""); await loadMessages(); }
      else alert("Failed to send image: " + err.message);
    }
    finally { setSendingImage(false); }
  };

  // ── Send video ──────────────────────────────────────────────────
  const handleSendVideo = async () => {
    if (!selectedVideo) return;
    setSendingVideo(true);
    try {
      await p2p.sendMessage({ recipientId: otherUserId, video: selectedVideo.dataUrl, text: videoCaption.trim() });
      setSelectedVideo(null); setVideoCaption(""); await loadMessages();
    } catch (err) {
      const fallbackOk = await sendViaFallback(selectedVideo.dataUrl, "video");
      if (fallbackOk) { setSelectedVideo(null); setVideoCaption(""); await loadMessages(); }
      else alert("Failed to send video: " + err.message);
    }
    finally { setSendingVideo(false); }
  };

  // ── Send voice ──────────────────────────────────────────────────
  const handleSendAudio = async (audioDataUrl, duration) => {
    try {
      await p2p.sendMessage({ recipientId: otherUserId, audio: audioDataUrl, duration });
      setShowVoice(false);
      await loadMessages();
    } catch (err) {
      const fallbackOk = await sendViaFallback(audioDataUrl, "audio");
      if (fallbackOk) { setShowVoice(false); await loadMessages(); }
      else alert("Failed to send audio: " + err.message);
    }
  };

  // ── Send generic file ───────────────────────────────────────────
  const handleSendFile = useCallback((fileDataUrl, fileName, fileSize, fileType) => {
    (async () => {
      try {
        await p2p.sendMessage({
          recipientId: otherUserId,
          text: fileName || "",
          file: fileDataUrl,
          fileName, fileSize, fileType,
        });
        await loadMessages();
      } catch (err) {
        console.error("[ChatView] Failed to send file:", err);
        alert("Failed to send file: " + err.message);
      }
    })();
  }, [otherUserId, p2p, loadMessages]);

  // ── Mic button — opens voice recorder ───────────────────────────
  const handleMicDown = useCallback(() => {
    setShowVoice(true);
  }, []);

  // ── Media picker bridge listener ────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { dataUrl, type, thumbnail } = e.detail;
      if (type === "image") { setSelectedImage({ dataUrl, type }); }
      else if (type === "video") { setSelectedVideo({ dataUrl, type, thumbnail }); }
    };
    window.addEventListener("echo:mediaPicked", handler);
    return () => window.removeEventListener("echo:mediaPicked", handler);
  }, []);

  return {
    // State
    messageText, setMessageText,
    sending,
    selectedImage, setSelectedImage,
    imageCaption, setImageCaption,
    sendingImage,
    selectedVideo, setSelectedVideo,
    videoCaption, setVideoCaption,
    sendingVideo,
    showVoice, setShowVoice,
    // Computed
    hasText: messageText.trim().length > 0,
    // Handlers
    handleSendText,
    handleSendImage,
    handleSendVideo,
    handleSendAudio,
    handleSendFile,
    handleMicDown,
  };
}
