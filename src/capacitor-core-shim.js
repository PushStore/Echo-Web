// capacitor-core-shim.js — Web-only shim for @capacitor/core
// In the web-only build, Capacitor native plugins are not available.

// Creates a no-op listener handle (matches Capacitor's PluginListenerHandle)
function createNoOpHandle() {
  return { remove: () => Promise.resolve() };
}

export function registerPlugin(pluginName) {
  return new Proxy({}, {
    get(_target, prop) {
      // addListener returns a PluginListenerHandle with .remove()
      if (prop === 'addListener') {
        return (_eventName, _callback) => createNoOpHandle();
      }
      // All other methods: return async no-op functions
      return (...args) => Promise.resolve({});
    }
  });
}

// Also export a Capacitor global for window.Capacitor checks
export const Capacitor = {
  isNativePlatform: () => false,
  isPluginAvailable: () => false,
  addEventListener: () => {},
  removeEventListener: () => {},
  platform: 'web',
};
