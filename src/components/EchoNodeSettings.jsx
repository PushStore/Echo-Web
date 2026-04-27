import { useState, useEffect } from "react";
import { C } from "../theme.js";

/**
 * Shared Echo Node relay settings component.
 * Provides connect/disconnect UI, status display, and connection stats.
 * Used in both SettingsScreen and SettingsSheet.
 */
export default function EchoNodeSettings({ p2p }) {
  const [nodeUrl, setNodeUrl] = useState("");
  const [status, setStatus] = useState(null); // { connected, relayUrl, messagesStored, ... }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!p2p) return;
    // Restore saved URL from localStorage as fallback
    const savedUrl = localStorage.getItem("echo_node_url");
    if (savedUrl && !nodeUrl) setNodeUrl(savedUrl);
    p2p.getEchoNodeStatus?.().then(s => {
      if (s) {
        setStatus(s);
        if (s.relayUrl) setNodeUrl(s.relayUrl);
      }
    }).catch(() => {});
  }, [p2p]);

  const handleConnect = async () => {
    if (!nodeUrl.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await p2p.connectToEchoNode({ url: nodeUrl.trim() });
      if (result.connected) {
        setStatus(result);
        localStorage.setItem("echo_node_url", nodeUrl.trim());
      } else {
        setError("Could not connect. Check the URL and ensure the node is running.");
      }
    } catch (e) {
      setError(e.message || "Connection failed");
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await p2p.disconnectEchoNode?.();
      setStatus({ connected: false, relayUrl: "", messagesStored: 0, recipients: 0 });
      setError("");
    } catch (_) {}
    setLoading(false);
  };

  const isConnected = status?.connected;
  const dotColor = isConnected ? C.green : C.muted;

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Status indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
        <span style={{ color: isConnected ? C.green : C.muted, fontSize: 14, fontWeight: 600 }}>
          {isConnected ? "Connected to Echo Node" : "No Echo Node connected"}
        </span>
      </div>

      {/* URL input + connect/disconnect button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, overflow: "hidden" }}>
        <input
          value={nodeUrl}
          onChange={e => setNodeUrl(e.target.value)}
          placeholder="http://192.168.1.100"
          disabled={loading}
          style={{
            flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14,
            outline: "none", boxSizing: "border-box",
          }}
        />
        {isConnected ? (
          <button onClick={handleDisconnect} disabled={loading}
            style={{ background: "none", border: `1px solid ${C.danger}`, borderRadius: 8, padding: "10px 16px", color: C.danger, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            Disconnect
          </button>
        ) : (
          <button onClick={handleConnect} disabled={loading || !nodeUrl.trim()}
            style={{ background: `linear-gradient(90deg,${C.accentDark},${C.accent})`, border: "none", borderRadius: 8, padding: "10px 16px", color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: (loading || !nodeUrl.trim()) ? 0.6 : 1 }}>
            {loading ? "…" : "Connect"}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {/* Stats when connected */}
      {isConnected && (
        <div style={{ background: C.surface, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 12 }}>Messages queued</span>
            <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{status.messagesStored || 0}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 12 }}>Recipients</span>
            <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{status.recipients || 0}</span>
          </div>
          {status.version && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted, fontSize: 12 }}>Version</span>
              <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>v{status.version}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
        Connect to an Echo Node to use the social network. Enter the node's IP address (port 6881 is used automatically). An Echo Node is required for Echo to work.
      </div>
    </div>
  );
}
