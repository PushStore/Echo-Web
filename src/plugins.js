// plugins.js — Web-only no-op plugin stubs.
//
// The native Echo app uses Capacitor plugins (P2PCore, BleMesh, VideoCache).
// On the web we don't have those plugins, so we export safe no-op proxies.
// This prevents "plugin not implemented on web" errors and ensures
// addListener() returns a handle with a working .remove() method.

// ── No-op listener handle (matches Capacitor's PluginListenerHandle) ─────
function createNoOpHandle() {
  return { remove: async () => {} };
}

// ── Web no-op proxy for a Capacitor plugin ──────────────────────────────
function webNoOpPlugin(pluginName) {
  return new Proxy({}, {
    get(_target, prop) {
      // addListener must return a handle with a working .remove() method
      if (prop === 'addListener') {
        return (_eventName, _callback) => createNoOpHandle();
      }
      // All other methods: return async no-op functions
      return (..._args) => Promise.resolve({});
    }
  });
}

// ── Export all plugins as no-op proxies ─────────────────────────────────
// These are imported by mothership.js, p2p.js, ble.js, videoBlobCache.js,
// and useMothership.js instead of the real Capacitor native plugins.

/** P2PCore — main P2P bridge plugin (social, messaging, relay, etc.) */
export const P2PCorePlugin = webNoOpPlugin('P2PCore');

/** BleMesh — BLE mesh networking plugin */
export const BleMeshPlugin = webNoOpPlugin('BleMesh');

/** VideoCache — ExoPlayer video caching plugin */
export const VideoCachePlugin = webNoOpPlugin('VideoCache');
