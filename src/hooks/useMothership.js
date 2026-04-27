import { useState, useEffect, useRef, useCallback } from "react";
import { registerPlugin } from "../capacitor-core-shim.js";
import motherShip from "../mothership.js";

const P2PCore = registerPlugin('P2PCore');

// ── Mother Ship connection: connect on login, event listeners, disconnect ────
// Returns { mothershipConnected, mothershipStatus, mothershipConnecting,
//            triggerMothershipFallback, handleDisconnectMothership,
//            disconnectOnLogout, syncOnNodeReconnect }
//
// nodeConnected is passed in so the hook can auto-disconnect Mother Ship when
// the local Echo Node comes back online.
export function useMothership(me, nodeConnected) {
  const [mothershipConnected, setMothershipConnected] = useState(false);
  const [mothershipStatus, setMothershipStatus] = useState(null);
  const [mothershipConnecting, setMothershipConnecting] = useState(false);
  const mothershipCleanupRef = useRef(null);

  // ── Mother Ship manual fallback trigger (used by App.js for explicit reconnect) ──
  const triggerMothershipFallback = useCallback(async (user) => {
    const key = user?.publicKey || user?.userId;
    if (!key) {
      console.log("[Echo] Cannot connect to Mother Ship: no publicKey/userId");
      return;
    }
    console.log("[Echo] Connecting to Mother Ship (manual fallback)");
    setMothershipConnecting(true);
    try {
      await motherShip.connect(key);
    } catch (e) {
      console.error("[Echo] Mother Ship connection failed:", e);
      setMothershipConnecting(false);
    }
  }, []);

  // ── Connect Mother Ship after login ──────────────────────────────────────
  useEffect(() => {
    if (!me?.userId) return;
    let cancelled = false;
    const connect = async () => {
      try {
        console.log('[MotherShip] connecting after login, userId:', me.userId);
        const result = await motherShip.connect(me.userId);
        if (!cancelled && result?.connected) {
          console.log('[MotherShip] connected to Mother Ship');
        } else if (!cancelled) {
          console.warn('[MotherShip] not available (will use as fallback)');
        }
      } catch (e) {
        console.warn('[MotherShip] connect error (non-fatal):', e.message || e);
      }
    };
    connect();
    return () => { cancelled = true; };
  }, [me?.userId]);

  // ── Disconnect on logout ─────────────────────────────────────────────────
  useEffect(() => {
    if (me) return; // not logged out
    motherShip.removeAllListeners();
    motherShip.disconnect().catch(() => {});
    console.log('[MotherShip] disconnected on logout');
  }, [me]);

  // ── Sync: disconnect Mother Ship when Node comes back online ─────────────
  // This effect watches `nodeConnected` transitions from false → true.
  const prevConnectedRef = useRef(nodeConnected);
  useEffect(() => {
    if (prevConnectedRef.current === false && nodeConnected === true && mothershipConnected) {
      console.log("[Echo] Node reconnected, disconnecting Mother Ship fallback");
      motherShip.disconnect().catch(() => {});
      setMothershipConnected(false);
      setMothershipStatus(null);
    }
    prevConnectedRef.current = nodeConnected;
  }, [nodeConnected, mothershipConnected]);

  // ── Mother Ship event listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!me) return;
    let cleanedUp = false;

    const setup = async () => {
      try {
        // Connection events from P2PCore's mothershipConnectionChanged
        const connHandle = P2PCore.addListener('mothershipConnectionChanged', (event) => {
          if (cleanedUp) return;
          const type = event?.type;
          if (type === "connected") {
            setMothershipConnected(true);
            setMothershipConnecting(false);
            setMothershipStatus(event);
            console.log("[Echo] Mother Ship connected", event.connectionId || "");
          } else if (type === "disconnected") {
            setMothershipConnected(false);
            setMothershipConnecting(false);
            setMothershipStatus(null);
          } else if (type === "reconnecting") {
            setMothershipConnecting(true);
          }
        });

        // Incoming DM events from P2PCore's dmReceived
        const dmHandle = P2PCore.addListener('dmReceived', (event) => {
          if (cleanedUp) return;
          if (event?.source === "mothership") {
            console.log("[Echo] Mother Ship DM for conversation", event?.conversationId);
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("echo-dm-received", { detail: event }));
          }
        });

        mothershipCleanupRef.current = async () => {
          cleanedUp = true;
          try { await connHandle?.remove(); } catch (_) {}
          try { await dmHandle?.remove(); } catch (_) {}
        };
      } catch (e) {
        console.warn("[Echo] Failed to setup Mother Ship listeners:", e);
      }
    };

    setup();
    return () => {
      cleanedUp = true;
      mothershipCleanupRef.current?.();
    };
  }, [me]);

  // ── Mother Ship disconnect handler ───────────────────────────────────────
  const handleDisconnectMothership = useCallback(async () => {
    try {
      await motherShip.disconnect();
    } catch (_) {}
    setMothershipConnected(false);
    setMothershipStatus(null);
  }, []);

  // ── Disconnect on logout (called explicitly from App) ────────────────────
  const disconnectOnLogout = useCallback(() => {
    motherShip.disconnect().catch(() => {});
    setMothershipConnected(false);
    setMothershipStatus(null);
  }, []);

  return {
    mothershipConnected,
    mothershipStatus,
    mothershipConnecting,
    triggerMothershipFallback,
    handleDisconnectMothership,
    disconnectOnLogout,
  };
}
