// mock-storage.js — Mock for media storage preference methods
// Simulates P2PCore storage strategy operations for browser dev/testing.

// In-memory storage preference (persists across hot reloads via module-level variable)
let _storageType = "p2p";
let _gdriveConnected = false;
let _web3Connected = false;
let _gdriveHasRefreshToken = false;
let _web3Email = null;
let _web3DID = null;

export const getStoragePreference = async () => ({
  storageType: _storageType,
  gdriveConnected: _gdriveConnected,
  web3Connected: _web3Connected,
  web3Email: _web3Email,
  web3DID: _web3DID,
});

export const setStoragePreference = async ({ storageType }) => {
  if (!["p2p", "gdrive", "web3"].includes(storageType)) {
    return { success: false, error: "Invalid storage type" };
  }
  _storageType = storageType;
  // Disconnect others when switching
  if (storageType !== "gdrive") { _gdriveConnected = false; _gdriveHasRefreshToken = false; }
  if (storageType !== "web3") { _web3Connected = false; _web3Email = null; _web3DID = null; }
  return { success: true, storageType };
};

export const connectGoogleDrive = async ({ accessToken, refreshToken, serverAuthCode, expiresIn }) => {
  // Accept either an accessToken or a serverAuthCode (exchanged on the backend)
  if (!accessToken && !serverAuthCode) return { success: false, error: "Access token or server auth code required" };
  _gdriveConnected = true;
  _gdriveHasRefreshToken = !!(refreshToken || serverAuthCode);
  _storageType = "gdrive";
  return { success: true, connected: true, hasRefreshToken: _gdriveHasRefreshToken };
};

export const disconnectGoogleDrive = async () => {
  _gdriveConnected = false;
  _gdriveHasRefreshToken = false;
  if (_storageType === "gdrive") _storageType = "p2p";
  return { success: true, disconnected: true };
};

export const connectWeb3Storage = async ({ delegationToken, did, email }) => {
  if (!delegationToken) return { success: false, error: "Delegation token required" };
  _web3Connected = true;
  _web3Email = email || null;
  _web3DID = did || null;
  _storageType = "web3";
  return { success: true, connected: true };
};

export const disconnectWeb3Storage = async () => {
  _web3Connected = false;
  _web3Email = null;
  _web3DID = null;
  if (_storageType === "web3") _storageType = "p2p";
  return { success: true, disconnected: true };
};

export const getStorageStatus = async () => ({
  storageType: _storageType,
  gdriveConnected: _gdriveConnected,
  web3Connected: _web3Connected,
  web3Email: _web3Email,
  web3DID: _web3DID,
  gdriveHasRefreshToken: _gdriveHasRefreshToken,
});
