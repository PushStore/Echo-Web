// File: src/mothership.js
// mothership.js — JS bridge for Mother Ship connectivity.
// Uses P2PCore Capacitor plugin for Mother Ship connectivity.
// Auto-selects native plugin on device.
//
// Events (via Capacitor addListener on P2PCore):
//   "mothershipConnectionChanged" — connection state change via P2PCore
//   "mothershipDmReceived" — incoming DM via P2PCore
//   "mothershipNodeAssigned" — node assignment via P2PCore
//   "mothershipDmAck" — DM acknowledgment via P2PCore

import { registerPlugin } from "./capacitor-core-shim.js";

// ── Native plugin ──────────────────────────────────────────────────────
const P2PCore = registerPlugin('P2PCore');

// ── Constants ─────────────────────────────────────────────────────────────

/** Default Mother Ship URL — used when no addresses are configured */
export const DEFAULT_MOTHERSHIP_URL = "ws://35.208.81.221:6884";

/** localStorage key for persisted Mother Ship addresses */
export const MOTHERSHIP_ADDRESSES_KEY = "echo_mothership_addresses";

/**
 * Persist Mother Ship addresses to localStorage.
 * @param {string[]} addresses
 */
export const saveMothershipAddresses = (addresses) => {
  try {
    localStorage.setItem(MOTHERSHIP_ADDRESSES_KEY, JSON.stringify(addresses));
  } catch (_) {}
};

/**
 * Load persisted Mother Ship addresses from localStorage.
 * @returns {string[]}
 */
export const loadMothershipAddresses = () => {
  try {
    const raw = localStorage.getItem(MOTHERSHIP_ADDRESSES_KEY);
    if (!raw) return [DEFAULT_MOTHERSHIP_URL];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_MOTHERSHIP_URL];
  } catch (_) {
    return [DEFAULT_MOTHERSHIP_URL];
  }
};

// ── MotherShipClient class (P2PCore integration, default export) ─────────

/**
 * Mother Ship client — wraps P2PCore Capacitor plugin for Mother Ship connectivity.
 * Mother Ship is the cloud relay fallback when a local Echo Node is unavailable.
 * The native Java plugin is registered as "P2PCore" (see P2PCorePlugin.java).
 */
class MotherShipClient {
  constructor() {
    this.connected = false;
    this.mothershipUrl = null;
    this._dmListenerHandle = null;
    this._connListenerHandle = null;
    this._nodeListenerHandle = null;
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  // Connect to Mother Ship (called on app startup after login)
  async connect(userPublicKey) {
    try {
      console.log('[MotherShip] connecting…');
      const result = await P2PCore.connectToMothership({ publicKey: userPublicKey });
      this.connected = !!result.connected;
      this.mothershipUrl = result.mothershipUrl || null;
      console.log('[MotherShip] connect initiated:', this.connected ? 'ALREADY CONNECTED' : 'CONNECTING',
                  this.mothershipUrl ? `(${this.mothershipUrl})` : '');
      // If not connected yet, poll for a few seconds since WebSocket connects asynchronously
      if (!this.connected) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 500));
          try {
            const status = await this.getStatus();
            if (status.connected) {
              this.connected = true;
              this.mothershipUrl = status.mothershipUrl || this.mothershipUrl;
              console.log('[MotherShip] connected after polling (', (i + 1) * 500, 'ms)');
              return { connected: true, mothershipUrl: this.mothershipUrl, connectionId: status.connectionId };
            }
          } catch (_) {}
        }
        console.warn('[MotherShip] connection not established after 5s');
      }
      return { connected: this.connected, mothershipUrl: this.mothershipUrl };
    } catch (e) {
      console.error('[MotherShip] connect error:', e.message || e);
      this.connected = false;
      return { connected: false, error: e.message };
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  async disconnect() {
    try {
      console.log('[MotherShip] disconnecting…');
      const result = await P2PCore.disconnectFromMothership();
      this.connected = false;
      this.mothershipUrl = null;
      console.log('[MotherShip] disconnected');
      return result;
    } catch (e) {
      console.error('[MotherShip] disconnect error:', e.message || e);
      return { success: false, error: e.message };
    }
  }

  // ── Status ─────────────────────────────────────────────────────────────────
  // Get current connection status
  async getStatus() {
    try {
      const result = await P2PCore.getMothershipStatus();
      this.connected = result.connected;
      this.mothershipUrl = result.mothershipUrl || null;
      return result;
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  // ── Send DM ────────────────────────────────────────────────────────────────
  // Send DM through Mother Ship (fallback when Echo Node is unavailable)
  async sendDm(recipientId, encryptedContent, messageType, conversationId) {
    try {
      console.log('[MotherShip] sendDm to', recipientId, 'type:', messageType || 'text');
      return await P2PCore.sendDmViaMothership({
        recipientId,
        encryptedContent,
        messageType: messageType || 'text',
        conversationId: conversationId || ''
      });
    } catch (e) {
      console.error('[MotherShip] sendDm error:', e.message || e);
      return { success: false, error: e.message };
    }
  }

  // ── Request nearby node assignment ─────────────────────────────────────────
  async requestNode() {
    try {
      console.log('[MotherShip] requesting nearby node…');
      return await P2PCore.requestNearbyNode();
    } catch (e) {
      console.error('[MotherShip] requestNode error:', e.message || e);
      return { success: false, error: e.message };
    }
  }

  // ── Listeners ──────────────────────────────────────────────────────────────
  // Listen for incoming DMs from Mother Ship
  addDmListener(callback) {
    this.removeDmListener();
    this._dmListenerHandle = P2PCore.addListener('mothershipDmReceived', callback);
    console.log('[MotherShip] DM listener registered');
    return this._dmListenerHandle;
  }

  // Listen for connection state changes
  addConnectionListener(callback) {
    this.removeConnectionListener();
    this._connListenerHandle = P2PCore.addListener('mothershipConnectionChanged', callback);
    console.log('[MotherShip] connection listener registered');
    return this._connListenerHandle;
  }

  // Listen for node assignments
  addNodeAssignmentListener(callback) {
    this.removeNodeAssignmentListener();
    this._nodeListenerHandle = P2PCore.addListener('mothershipNodeAssigned', callback);
    console.log('[MotherShip] node assignment listener registered');
    return this._nodeListenerHandle;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  removeDmListener() {
    if (this._dmListenerHandle) {
      this._dmListenerHandle.remove();
      this._dmListenerHandle = null;
    }
  }

  removeConnectionListener() {
    if (this._connListenerHandle) {
      this._connListenerHandle.remove();
      this._connListenerHandle = null;
    }
  }

  removeNodeAssignmentListener() {
    if (this._nodeListenerHandle) {
      this._nodeListenerHandle.remove();
      this._nodeListenerHandle = null;
    }
  }

  // Remove all listeners (call on logout)
  removeAllListeners() {
    this.removeDmListener();
    this.removeConnectionListener();
    this.removeNodeAssignmentListener();
    console.log('[MotherShip] all listeners removed');
  }
}

// Singleton — shared across the app
export default new MotherShipClient();
