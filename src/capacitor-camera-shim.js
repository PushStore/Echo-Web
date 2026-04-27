// capacitor-camera-shim.js — Web-only shim for @capacitor/camera

export const CameraResultType = { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' };
export const CameraSource = { Prompt: 'PROMPT', Camera: 'CAMERA', Photos: 'PHOTOS' };

export const Camera = {
  async getPhoto(_options) {
    console.warn('[Echo-Web] Camera.getPhoto() called but Capacitor Camera is not available in web build');
    throw new Error('Camera is not available in web build. Please use a device with Capacitor for camera access.');
  },
};
