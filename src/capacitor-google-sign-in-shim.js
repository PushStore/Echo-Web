// capacitor-google-sign-in-shim.js — Web-only shim for @capawesome/capacitor-google-sign-in

export const GoogleSignIn = {
  async signIn() {
    console.warn('[Echo-Web] GoogleSignIn.signIn() called but native Google Sign-In is not available in web build');
    throw new Error('Google Sign-In plugin is not available in web build. Please use a device with Capacitor.');
  },
};
