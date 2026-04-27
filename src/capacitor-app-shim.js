// capacitor-app-shim.js — Web-only shim for @capacitor/app

export const App = {
  async exitApp() {
    console.warn('[Echo-Web] App.exitApp() called but Capacitor is not available in web build');
    // On web, close the current tab as a fallback
    window.close();
  },
  getState: () => ({ isActive: true }),
};
