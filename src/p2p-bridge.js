// p2p-bridge.js — Auto-selects web bridge or mock
// In the web-only build, there's no native Capacitor bridge.
//
// IMPORTANT: On web, we NEVER fall back to mock data.
// The web bridge (p2p-web.js) must be activated before any operation.
// If no real Echo Node is connected, operations will fail with clear errors
// rather than silently returning fake/mock data.

// ── localStorage keys ────────────────────────────────────────────────────
const LS_NODE_URL    = "echo_web_node_url";
const LS_PROFILE     = "echo_web_profile";

// Web bridge is loaded lazily — only when user connects to a node from browser
let _P2PWeb = null;

/**
 * Check if the web bridge has been activated (i.e. a real node is in use).
 */
export function isWebBridgeActive() {
  return _P2PWeb !== null;
}

/**
 * Get the current bridge type: "native", "web", or "none".
 */
export function getBridgeType() {
  if (window?.Capacitor?.isNativePlatform?.()) return "native";
  if (_P2PWeb) return "web";
  return "none";
}

// ── Stub that throws when no real bridge is available on web ──────────────
function requireRealBridge(methodName) {
  throw new Error(
    `[Echo] No Echo Node connected. Cannot call "${methodName}" without a real node. ` +
    `Please connect to an Echo Node first (go to Settings > Connect To Echo Node).`
  );
}

export const p2pBridge = new Proxy({}, {
  get(_target, prop) {
    // On native platform, use real plugin (not available in web build)
    if (window?.Capacitor?.isNativePlatform?.()) {
      try {
        const P2PNative = require("./p2p.js").P2PCore;
        return P2PNative[prop];
      } catch (e) {
        console.warn("[p2p-bridge] Native bridge not available:", e.message);
        // On native, falling back to mock is acceptable during dev
        const { P2PCore: P2PMock } = require("./p2p-mock.js");
        return P2PMock[prop];
      }
    }

    // On web: if real web bridge is loaded, use it
    if (_P2PWeb) return _P2PWeb[prop];

    // On web: a few read-only methods are allowed without a connection
    // (they are used during auth flow before node connection is established)
    const allowedWithoutNode = [
      "connectToEchoNode",
      "disconnectEchoNode",
      "getEchoNodeStatus",
      "getNetworkStatus",
      "startService",
      "stopService",
      "getStoragePreference",
    ];
    if (allowedWithoutNode.includes(prop)) {
      // These methods exist on P2PCore even before connecting — they just won't do anything useful
      // We still need to load the web bridge to access them
      // Return a no-op that will be replaced once activateWebBridge() is called
      return (...args) => {
        console.warn(`[p2p-bridge] "${prop}" called before web bridge was activated. Call activateWebBridge() first.`);
        return Promise.resolve({ success: false, error: "Web bridge not activated. Connect to an Echo Node first." });
      };
    }

    // On web: ALL other methods require a real node — no mock fallback
    // This prevents the app from silently using fake data
    console.error(`[p2p-bridge] "${prop}" called without an Echo Node connection — this will fail.`);
    return (...args) => requireRealBridge(prop);
  }
});

/**
 * Activate the real web bridge (p2p-web.js).
 * This MUST be called before any data operations on web.
 * The bridge talks to a real Echo Node over HTTP.
 */
export async function activateWebBridge() {
  if (window?.Capacitor?.isNativePlatform?.()) return null;
  const mod = await import("./p2p-web.js");
  _P2PWeb = mod.P2PCore;
  console.log("[p2p-bridge] Web bridge activated (real data mode)");
  return _P2PWeb;
}

/**
 * Auto-activate web bridge if there's a persisted profile or saved node URL.
 * Call this early (e.g., on app mount) so that p2pBridge routes to the
 * real web bridge instead of failing after page refresh.
 *
 * @returns {Promise<boolean>} true if web bridge was activated
 */
export async function autoActivateWebBridge() {
  if (window?.Capacitor?.isNativePlatform?.()) return false;

  // Check if there's a saved profile or node URL
  const hasProfile = (() => {
    try { return !!localStorage.getItem(LS_PROFILE); } catch (_) { return false; }
  })();
  const hasNodeUrl = (() => {
    try { return !!localStorage.getItem(LS_NODE_URL); } catch (_) { return false; }
  })();

  // Also check for the legacy key used by p2p-web.js
  const hasWebProfile = (() => {
    try { return !!localStorage.getItem("echo_web_profile"); } catch (_) { return false; }
  })();

  if (hasProfile || hasNodeUrl || hasWebProfile) {
    console.log("[p2p-bridge] Auto-activating web bridge (found persisted state)");
    await activateWebBridge();

    // If there's a saved node URL, auto-reconnect
    if (hasNodeUrl) {
      try {
        const savedUrl = localStorage.getItem(LS_NODE_URL);
        if (savedUrl && _P2PWeb) {
          console.log("[p2p-bridge] Auto-reconnecting to saved node:", savedUrl);
          const result = await _P2PWeb.connectToEchoNode({ url: savedUrl });
          if (result.connected) {
            console.log("[p2p-bridge] Auto-reconnect successful");
          } else {
            console.warn("[p2p-bridge] Auto-reconnect failed:", result.error);
          }
        }
      } catch (e) {
        console.warn("[p2p-bridge] Auto-reconnect error:", e.message);
      }
    }

    return true;
  }

  return false;
}

export function deactivateWebBridge() {
  _P2PWeb = null;
}
