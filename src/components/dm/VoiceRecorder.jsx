// File: src/components/dm/VoiceRecorder.jsx
//
// FIX: The original handleSendVoiceNote had a race condition where
// setSendingAudio(false) was in the outer finally block but the actual
// P2PCore.sendMessage() call was inside reader.onload (async callback).
// The loading state cleared before the send even started.
//
// Fix: convert FileReader to a Promise so the full send is awaited
// before finally runs.
import { useRef, useState, useEffect } from "react";
import { C } from "../../theme.js";

function formatDuration(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Props
 *  onSendAudio(audioDataUrl, durationSeconds) → Promise<void>
 *  onStarted()   — called when recording begins (optional)
 *  onCancelled() — called when user cancels  (optional)
 */
export default function VoiceRecorder({ onSendAudio, onStarted, onCancelled }) {
  const [phase, setPhase] = useState("idle"); // "idle" | "recording" | "preview" | "sending"
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const hasAutoStarted   = useRef(false);

  // Clean up on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
  }, []);

  // ── Start recording ──────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        setPhase("preview");
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setDuration(0);
      setPhase("recording");
      onStarted?.();

      timerRef.current = setInterval(
        () => setDuration(d => d + 1),
        1000
      );
    } catch {
      alert("Could not access microphone. Please check permissions.");
      onCancelled?.();
    }
  };

  // FIX #2: Auto-start recording when VoiceRecorder mounts.
  // The user already tapped the mic button in ChatView — don't show a second mic button.
  useEffect(() => {
    if (!hasAutoStarted.current && phase === "idle") {
      hasAutoStarted.current = true;
      startRecording();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop (save for preview) ──────────────────────────────
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  };

  // ── Cancel ───────────────────────────────────────────────
  const cancel = () => {
    stopRecording();
    setAudioBlob(null);
    setDuration(0);
    setPhase("idle");
    onCancelled?.();
  };

  // ── Play preview ─────────────────────────────────────────
  const playPreview = () => {
    if (!audioBlob) return;
    const url   = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play();
  };

  // ── Send — FIX: fully awaited, no race ──────────────────
  const sendVoiceNote = async () => {
    if (!audioBlob) return;
    setPhase("sending");
    try {
      // Convert blob → data URL as a proper Promise (was the race bug)
      const audioDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read audio blob"));
        reader.readAsDataURL(audioBlob);
      });

      // Await the actual network send before clearing state
      await onSendAudio(audioDataUrl, duration);

      // Only reset after everything succeeded
      setAudioBlob(null);
      setDuration(0);
      setPhase("idle");
    } catch (err) {
      alert("Failed to send voice note: " + err.message);
      setPhase("preview"); // let user retry
    }
  };

  // ── Render ───────────────────────────────────────────────
  // FIX #2: No idle mic button — recording auto-starts when mounted
  if (phase === "idle") {
    return null;
  }

  if (phase === "recording") {
    return (
      <div style={{
        flex: 1, background: "#1a1a1a", borderRadius: 20,
        padding: "8px 16px", display: "flex", alignItems: "center", gap: 12
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%", background: "#ff3b30",
          animation: "pulse 1s ease-in-out infinite"
        }} />
        <span style={{ color: C.text, fontSize: 14 }}>{formatDuration(duration)}</span>
        <button
          onClick={cancel}
          style={{
            marginLeft: "auto", background: C.bgSecondary, color: C.muted,
            border: "none", borderRadius: "50%", width: 32, height: 32,
            cursor: "pointer", fontSize: 16
          }}
        >&#10005;</button>
        <button
          onClick={stopRecording}
          style={{
            background: C.accent, color: "#000", border: "none",
            borderRadius: "50%", width: 44, height: 44,
            fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >&#9210;</button>
      </div>
    );
  }

  if (phase === "preview") {
    return (
      <div style={{
        flex: 1, background: "#1a1a1a", borderRadius: 20,
        padding: "8px 12px", display: "flex", alignItems: "center", gap: 8
      }}>
        <span style={{ fontSize: 18 }}>&#127908;</span>
        <span style={{ color: C.text, fontSize: 13, minWidth: 40 }}>
          {formatDuration(duration)}
        </span>
        <button
          onClick={playPreview}
          style={{
            background: "none", border: "none", color: C.text,
            fontSize: 18, cursor: "pointer", padding: "4px"
          }}
        >&#9654;</button>
        <button
          onClick={cancel}
          style={{
            background: "none", border: "none", color: C.muted,
            fontSize: 18, cursor: "pointer", padding: "4px"
          }}
        >&#10005;</button>
        <button
          onClick={sendVoiceNote}
          style={{
            background: C.accent, color: "#000", border: "none",
            borderRadius: "50%", width: 36, height: 36, fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: "auto"
          }}
        >&#10148;</button>
      </div>
    );
  }

  // "sending"
  return (
    <div style={{
      flex: 1, background: "#1a1a1a", borderRadius: 20,
      padding: "8px 16px", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 8
    }}>
      <span style={{ color: C.muted, fontSize: 14 }}>Sending voice note&#8230;</span>
    </div>
  );
}
