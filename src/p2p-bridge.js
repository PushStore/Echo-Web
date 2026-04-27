// p2p-bridge.js — Auto-selects web bridge or mock
// In the web-only build, there's no native Capacitor bridge.
import { P2PCore as P2PMock } from "./p2p-mock.js";

let _P2PWeb = null;

export const p2pBridge = new Proxy({}, {
  get(_target, prop) {
    // On native platform, use real plugin (not available in web build)
    if (window?.Capacitor?.isNativePlatform?.()) {
      // Lazy-import native bridge — only available in Android APK
      const P2PNative = require("./p2p.js").P2PCore;
      return P2PNative[prop];
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

export function deactivateWebBridge() {
  _P2PWeb = null;
}
