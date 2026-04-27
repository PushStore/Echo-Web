// plugins.js — Safe Capacitor plugin registration for native + web.
//
// Problem: `registerPlugin('P2PCore')` at module scope throws in browser
// because there's no web implementation registered for the native plugins.
// React StrictMode double-invokes effects, and the MotherShipClient calls
// `.remove()` on listener handles — which must be a working function.
//
// Solution: Wrap `registerPlugin` with a platform check. On native, use the
// real plugin. On web, return a no-op proxy that has working `addListener`
// returning `{ remove: () => Promise.resolve() }`.
//
// All files that previously called `registerPlugin` directly should import
// from here instead.

import { Capacitor, registerPlugin } from '@capacitor/core';

// ── No-op listener handle (matches Capacitor's PluginListenerHandle) ─────
function createNoOpHandle() {
  return { remove: async () => {} };
}

// ── Web-only no-op proxy for a Capacitor plugin ───────────────────────────
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

// ── Safe registration: native plugin on device, no-op on web ──────────────
function safeRegisterPlugin(name) {
  try {
    if (Capacitor?.isNativePlatform?.()) {
      return registerPlugin(name);
    }
  } catch (_) {
    // Capacitor global not available
  }
  console.debug(`[plugins] ${name} — using web no-op (native plugin not available)`);
  return webNoOpPlugin(name);
}

// ── Export all plugins ────────────────────────────────────────────────────
// These are shared singletons — imported by mothership.js, p2p.js, ble.js,
// videoBlobCache.js, and useMothership.js instead of calling registerPlugin
// directly at module scope.

/** P2PCore — main P2P bridge plugin (social, messaging, relay, etc.) */
export const P2PCorePlugin = safeRegisterPlugin('P2PCore');

/** BleMesh — BLE mesh networking plugin */
export const BleMeshPlugin = safeRegisterPlugin('BleMesh');

/** VideoCache — ExoPlayer video caching plugin */
export const VideoCachePlugin = safeRegisterPlugin('VideoCache');
