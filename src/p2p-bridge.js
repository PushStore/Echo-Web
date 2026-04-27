// p2p-bridge.js — Auto-selects web bridge or mock
// In the web-only build, there's no native Capacitor bridge.
import { P2PCore as P2PMock } from "./p2p-mock.js";

// ── localStorage keys ────────────────────────────────────────────────────
const LS_NODE_URL    = "echo_web_node_url";
const LS_PROFILE     = "echo_web_profile";

// Web bridge is loaded lazily — only when user connects to a node from browser
let _P2PWeb = null;

export const p2pBridge = new Proxy({}, {
  get(_target, prop) {
    // On native platform, use real plugin (not available in web build)
    if (window?.Capacitor?.isNativePlatform?.()) {
      // Lazy-import native bridge — only available in Android APK
      try {
        const P2PNative = require("./p2p.js").P2PCore;
        return P2PNative[prop];
      } catch (e) {
        console.warn("[p2p-bridge] Native bridge not available:", e.message);
        return P2PMock[prop];
      }
    }
    // If web bridge is loaded, use it
    if (_P2PWeb) return _P2PWeb[prop];
    // Otherwise use mock
    return P2PMock[prop];
  }
});

export async function activateWebBridge() {
  if (window?.Capacitor?.isNativePlatform?.()) return null;
  const mod = await import("./p2p-web.js");
  _P2PWeb = mod.P2PCore;
  return _P2PWeb;
}

/**
 * Auto-activate web bridge if there's a persisted profile or saved node URL.
 * Call this early (e.g., on app mount) so that p2pBridge routes to the
 * real web bridge instead of mock after page refresh.
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
