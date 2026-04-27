// mock-node-relay.js — Echo Node relay & network mock methods
import { _posts } from "./mock-state.js";

export async function connectToEchoNode({ url }) {
  console.log('[Mock] connectToEchoNode:', url);
  return { connected: true, relayUrl: url, messagesStored: 0, recipients: 0 };
}

export async function disconnectEchoNode() {
  console.log('[Mock] disconnectEchoNode');
  return { connected: false };
}

export async function getEchoNodeStatus() {
  return { connected: true, relayUrl: "", messagesStored: 0, recipients: 0, uptime: 0 };
}

export async function getNetworkStatus() {
  return { online: true, peersConnected: 0, seedingCount: _posts.length };
}

export async function startService() {
  return { success: true };
}

export async function stopService() {
  return { success: true };
}
