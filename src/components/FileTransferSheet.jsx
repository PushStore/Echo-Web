import { useState, useEffect, useCallback } from "react";
import { C } from "../theme.js";
import Sheet from "./Sheet.jsx";

export default function FileTransferSheet({ show, onClose, p2p, onModalOpen, onModalClose }) {
  const [tab, setTab] = useState("all"); // "all" | "incoming" | "outgoing"
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (show) loadTransfers();
  }, [show]);

  const loadTransfers = useCallback(async () => {
    if (!p2p) return;
    setLoading(true);
    try {
      const result = await p2p.transferList({ status: tab === "all" ? undefined : tab });
      // Support different response shapes from mock vs real
      const list = result?.transfers || result?.pending || result?.active || [];
      setTransfers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn("Failed to load transfers:", e);
      setTransfers([]);
    }
    setLoading(false);
  }, [p2p, tab]);

  const handleAccept = async (sessionId) => {
    if (!p2p) return;
    setMessage("");
    try {
      const result = await p2p.transferAccept({ sessionId });
      if (result?.success) {
        setMessage("Transfer accepted");
        loadTransfers();
      } else {
        setMessage(result?.error || "Failed to accept transfer");
      }
    } catch (e) {
      setMessage("Error: " + (e.message || "Unknown error"));
    }
  };

  const handleDecline = async (sessionId) => {
    if (!p2p) return;
    setMessage("");
    try {
      const result = await p2p.transferDecline({ sessionId });
      if (result?.success) {
        loadTransfers();
      } else {
        setMessage(result?.error || "Failed to decline transfer");
      }
    } catch (e) {
      setMessage("Error: " + (e.message || "Unknown error"));
    }
  };

  const handleCancel = async (sessionId) => {
    if (!p2p) return;
    setMessage("");
    try {
      const result = await p2p.transferCancel({ sessionId });
      if (result?.success) {
        loadTransfers();
      } else {
        setMessage(result?.error || "Failed to cancel transfer");
      }
    } catch (e) {
      setMessage("Error: " + (e.message || "Unknown error"));
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const statusColor = (status) => {
    switch (status) {
      case "completed": return C.green;
      case "transferring": return C.accent;
      case "pending": return "#f59e0b";
      case "failed": return C.danger;
      case "cancelled": return C.muted;
      default: return C.muted;
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "completed": return "Completed";
      case "transferring": return "Transferring...";
      case "pending": return "Pending";
      case "failed": return "Failed";
      case "cancelled": return "Cancelled";
      default: return status || "Unknown";
    }
  };

  const getProgress = (t) => {
    if (t.total_blocks > 0 && t.blocks_received !== undefined) {
      return Math.min(100, Math.round((t.blocks_received / t.total_blocks) * 100));
    }
    if (t.progress !== undefined && t.total_blocks === undefined) {
      return Math.min(100, Math.round(t.progress * 100));
    }
    return 0;
  };

  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose} title="File Transfers" showClose>
      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, borderRadius: 10, padding: 3 }}>
        {["all", "incoming", "outgoing"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13,
              background: tab === t ? C.border : "none",
              color: tab === t ? C.text : C.muted,
              transition: "all .15s",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Transfer list */}
      {loading && !transfers.length ? (
        <div style={{ color: C.muted, textAlign: "center", padding: "32px 0" }}>Loading...</div>
      ) : transfers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ color: C.muted, fontSize: 14 }}>No transfers</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            {tab === "incoming" ? "No incoming file transfers" : tab === "outgoing" ? "No outgoing file transfers" : "No file transfers yet"}
          </div>
        </div>
      ) : (
        <div>
          {transfers.map((t) => {
            const sessionId = t.session_id || t.sessionId;
            const progress = getProgress(t);
            const isActive = t.status === "transferring";
            const isPending = t.status === "pending";
            const isOutgoing = t.sender_id === undefined ? true : false; // Default to outgoing display
            const fileName = t.file_name || t.fileName || "Unknown file";

            return (
              <div key={sessionId} style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: 14, marginBottom: 10,
              }}>
                {/* File info row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: isActive ? "rgba(110,231,183,0.15)" : C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isActive ? C.accent : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: C.text, fontSize: 14, fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {fileName}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {formatSize(t.file_size || t.fileSize)}
                      {t.created_at && ` · ${formatTime(t.created_at)}`}
                    </div>
                  </div>
                  <div style={{
                    color: statusColor(t.status), fontSize: 12, fontWeight: 700,
                    flexShrink: 0, textTransform: "uppercase",
                  }}>
                    {statusLabel(t.status)}
                  </div>
                </div>

                {/* Progress bar for active transfers */}
                {(isActive || (isPending && progress > 0)) && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{
                      width: "100%", height: 4, borderRadius: 2, background: C.bg, overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${progress}%`, height: "100%", borderRadius: 2,
                        background: `linear-gradient(90deg, ${C.accentDark}, ${C.accent})`,
                        transition: "width .3s ease",
                      }} />
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                      {progress}% complete
                      {t.blocks_received !== undefined && t.total_blocks > 0 && ` (${t.blocks_received}/${t.total_blocks} blocks)`}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {isPending && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleAccept(sessionId)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                        background: `linear-gradient(90deg,${C.accentDark},${C.accent})`,
                        color: "#000", fontWeight: 700, fontSize: 13,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(sessionId)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: `1px solid ${C.border}`, cursor: "pointer",
                        background: "none", color: C.text, fontWeight: 700, fontSize: 13,
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
                {(isActive || t.status === "pending") && (
                  <button
                    onClick={() => handleCancel(sessionId)}
                    style={{
                      width: "100%", padding: "8px 0", borderRadius: 8,
                      border: `1px solid ${C.danger}`, cursor: "pointer",
                      background: "none", color: C.danger, fontWeight: 700, fontSize: 13, marginTop: 8,
                    }}
                  >
                    Cancel Transfer
                  </button>
                )}
              </div>
            );
          })}

          {/* Refresh button */}
          <button
            onClick={loadTransfers}
            disabled={loading}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 8,
              border: `1px solid ${C.border}`, cursor: loading ? "default" : "pointer",
              background: "none", color: C.muted, fontSize: 13,
              opacity: loading ? 0.5 : 1,
            }}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div style={{
          marginTop: 12, padding: "10px 12px", borderRadius: 8,
          background: message.startsWith("Error") ? "rgba(244,33,46,0.1)" : "rgba(0,186,124,0.1)",
          color: message.startsWith("Error") ? C.danger : C.green,
          fontSize: 13,
        }}>
          {message}
        </div>
      )}
    </Sheet>
  );
}
