// capacitor-app-shim.js — Web-only shim for @capacitor/app

// No-op listener handle (matches Capacitor's PluginListenerHandle)
const noOpHandle = { remove: () => Promise.resolve() };

export const App = {
  async exitApp() {
    console.warn('[Echo-Web] App.exitApp() called — no-op on web');
  },
  getState: () => ({ isActive: true }),
  addListener: (_eventName, _callback) => noOpHandle,
};
