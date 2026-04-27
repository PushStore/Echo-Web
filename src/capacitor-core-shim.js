// capacitor-core-shim.js — Web-only shim for @capacitor/core
// In the web-only build, Capacitor native plugins are not available.

export function registerPlugin(pluginName) {
  return new Proxy({}, {
    get(_target, prop) {
      return async (...args) => {
        console.warn(`[Echo-Web] ${pluginName}.${prop}() called but Capacitor is not available in web build`);
        return {};
      };
    }
  });
}
