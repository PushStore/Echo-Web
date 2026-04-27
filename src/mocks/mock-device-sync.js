// mock-device-sync.js — Multi-device sync mock methods
import { _devices } from "./mock-state.js";

export async function deviceRegister({ deviceId, deviceName, deviceType, publicKey, prekey, capabilities }) {
  console.log('[Mock] deviceRegister:', deviceName);
  const existing = _devices.findIndex(d => d.deviceId === deviceId);
  const device = { deviceId, deviceName, deviceType: deviceType || "mobile", lastSeen: Date.now(), capabilities: capabilities || [] };
  if (existing >= 0) { _devices[existing] = device; } else { _devices.push(device); }
  return { success: true, deviceId };
}

export async function deviceList({ userId }) {
  return { devices: _devices, count: _devices.length };
}

export async function deviceHeartbeat({ deviceId }) {
  const device = _devices.find(d => d.deviceId === deviceId);
  if (device) device.lastSeen = Date.now();
  return { success: true };
}

export async function deviceRevoke({ deviceId, userId }) {
  const idx = _devices.findIndex(d => d.deviceId !== deviceId);
  if (idx >= 0) _devices.splice(idx, 1);
  return { success: true, revoked: deviceId };
}

export async function deviceGetStatus() {
  return { currentDevice: _devices[0]?.deviceId || null, totalDevices: _devices.length, lastSync: Date.now() };
}

export async function syncGetDevices({ userId }) {
  return { devices: _devices, count: _devices.length };
}

export async function syncPullDevice({ deviceId, lastSyncVersion }) {
  return { mutations: [], versionVector: { v: Date.now() }, hasMore: false };
}

export async function syncPushDevice({ deviceId, mutations, versionVector }) {
  return { success: true, accepted: mutations?.length || 0, versionVector: { v: Date.now() } };
}
