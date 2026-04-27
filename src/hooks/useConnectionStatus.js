import { useState, useEffect, useRef } from "react";
import { p2pBridge } from "../p2p-bridge.js";

// ── Node connection status: polling, auto-reconnect, derived state ────────────
// Returns { nodeConnected, nodeStatus }
//
// When a saved echo_node_url exists and the node drops, this hook attempts up
// to 3 automatic reconnects before giving up (the caller can then trigger a
// Mother Ship fallback).
export function useConnectionStatus(me) {
  const [nodeConnected, setNodeConnected] = useState(false);
  const [nodeStatus, setNodeStatus] = useState(null);
  const prevConnectedRef = useRef(false);

  useEffect(() => {
    if (!me) return;
    let reconnectAttempt = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;

    const check = async () => {
      try {
        const s = await p2pBridge?.getEchoNodeStatus?.();
        if (s) {
          const wasConnected = prevConnectedRef.current;
          const nowConnected = !!s.connected;
          prevConnectedRef.current = nowConnected;
          setNodeConnected(nowConnected);
          setNodeStatus(s);

          // Auto-reconnect: if just disconnected and saved URL exists
          if (wasConnected && !nowConnected && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
            const savedUrl = localStorage.getItem("echo_node_url");
            if (savedUrl) {
              reconnectAttempt++;
              console.log(`[Echo] Auto-reconnecting to ${savedUrl} (attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`);
              try {
                const result = await p2pBridge.connectToEchoNode({ url: savedUrl });
                if (result.connected) {
                  prevConnectedRef.current = true;
                  setNodeConnected(true);
                  setNodeStatus(result);
                  reconnectAttempt = 0;
                }
              } catch (_) {}
            }
          }

          if (nowConnected) {
            reconnectAttempt = 0;
          }
        }
      } catch (_) {
        prevConnectedRef.current = false;
        setNodeConnected(false);
      }
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  return { nodeConnected, nodeStatus };
}
