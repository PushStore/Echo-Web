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

// ── P2P Block Sync Mocks (Scenarios A, B, C) ──────────────────────────

export async function seedAnnounce({ mediaHash, deviceId, listingId, manifest, ttlMinutes }) {
  console.log('[Mock] seedAnnounce:', mediaHash);
  return { success: true, media_hash: mediaHash, expires_at: Date.now() + (ttlMinutes || 60) * 60000 };
}

export async function seedGetStatus() {
  return { seeders: [], seeding_count: 0 };
}

export async function seedLookup({ mediaHash }) {
  console.log('[Mock] seedLookup:', mediaHash);
  return { seeders: [], seeder_count: 0 };
}

export async function seedRemove({ mediaHash, deviceId }) {
  console.log('[Mock] seedRemove:', mediaHash);
  return { success: true, removed: mediaHash };
}

export async function blockBuffer({ fileHash, blockIndex, data }) {
  console.log('[Mock] blockBuffer:', fileHash, 'block', blockIndex);
  return { success: true, file_hash: fileHash, block_index: blockIndex };
}

export async function blockGet({ fileHash, blockIndex }) {
  console.log('[Mock] blockGet:', fileHash, 'block', blockIndex);
  return { success: false, error: "Block not found (mock)" };
}

export async function blockAck({ fileHash, blockIndex }) {
  return { success: true, file_hash: fileHash, block_index: blockIndex };
}

// ── File Transfer Mocks (Scenario B) ───────────────────────────────────

export async function transferCreate({ fileHash, fileName, fileSize, mimeType, recipientId, manifest }) {
  console.log('[Mock] transferCreate:', fileName, 'to', recipientId);
  return {
    success: true,
    session_id: "xfer_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    file_hash: fileHash,
    file_name: fileName,
    file_size: fileSize,
    status: "pending",
  };
}

export async function transferList({ status }) {
  return { transfers: [], pending: [], active: [] };
}

export async function transferAccept({ sessionId }) {
  console.log('[Mock] transferAccept:', sessionId);
  return { success: true, session_id: sessionId, status: "transferring" };
}

export async function transferDecline({ sessionId }) {
  console.log('[Mock] transferDecline:', sessionId);
  return { success: true, session_id: sessionId, status: "cancelled" };
}

export async function transferCancel({ sessionId }) {
  console.log('[Mock] transferCancel:', sessionId);
  return { success: true, session_id: sessionId, status: "cancelled" };
}

export async function transferProgress({ sessionId }) {
  return { progress: 0, blocks_received: 0, total_blocks: 0, status: "pending" };
}

export async function transferBlockReceived({ sessionId, blockIndex }) {
  return { success: true, session_id: sessionId, block_index: blockIndex };
}

// ── Device Pairing Mocks (Scenario D) ─────────────────────────────────

export async function pairGenerate({ label }) {
  console.log('[Mock] pairGenerate:', label);
  return {
    success: true,
    token: "pair_" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12),
    label: label || "Web Browser",
    expires_at: Date.now() + 600000,
  };
}

export async function pairVerify({ token, deviceName, deviceType, publicKey }) {
  console.log('[Mock] pairVerify:', token, deviceName);
  return {
    success: true,
    pairing_id: "pr_" + Date.now().toString(36),
    device_name: deviceName || "Web Browser",
    device_type: deviceType || "web",
    paired_at: Date.now(),
  };
}

export async function pairList() {
  return { devices: [] };
}

export async function pairUnpair({ pairingId }) {
  console.log('[Mock] pairUnpair:', pairingId);
  return { success: true, unpaired: pairingId };
}

// ── Multi-Device Sync Delta ───────────────────────────────────────────

export async function deviceSyncDelta({ deviceId }) {
  return { new_dms: [], new_group_msgs: [], last_sync: Date.now() };
}
