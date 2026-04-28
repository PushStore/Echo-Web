// mothership-web-client.js — Web-based Mother Ship client for browser.
//
// On native Android, the Mother Ship client uses the P2PCore Capacitor plugin
// which connects via a native WebSocket. On web, we need a pure JavaScript
// WebSocket client that:
//   1. Connects to the Mother Ship WebSocket server
//   2. Registers the user's public key
//   3. Requests a nearby Echo Node assignment
//   4. Dispatches events for connection state changes and incoming DMs
//
// The Mother Ship runs at ws://35.208.81.221:6884 (default).

const DEFAULT_MOTHERSHIP_URL = "ws://35.208.81.221:6884";

// ── Timeouts (ms) ────────────────────────────────────────────────────────────
const WS_CONNECT_TIMEOUT   = 15000; // WebSocket connection timeout (was 10s, increased for slow networks)
const WS_REGISTER_WAIT     = 2000;  // Wait for server "connected" response after register
const NODE_REQUEST_TIMEOUT = 15000; // Node assignment request timeout (was 10s)

// ── Module-level state ────────────────────────────────────────────────────
let _ws = null;
let _connected = false;
let _url = null;
let _publicKey = "";
let _reconnectTimer = null;
let _heartbeatTimer = null;
let _messageCallback = null;
let _connectionCallback = null;
let _nodeCallback = null;

// ── EventTarget for external listeners ───────────────────────────────────
const _eventTarget = new EventTarget();

// ── WebSocket message handler ────────────────────────────────────────────
function handleRawMessage(event) {
  try {
    const msg = JSON.parse(event.data);
    console.log("[MotherShip-Web] received:", msg.type || msg.action || "unknown");

    switch (msg.type || msg.action) {
      case "connected":
      case "connection_established":
        _connected = true;
        _connectionCallback?.({ type: "connected", connectionId: msg.connectionId });
        _eventTarget.dispatchEvent(new CustomEvent("mothershipConnectionChanged", {
          detail: { type: "connected", connectionId: msg.connectionId }
        }));
        break;

      case "disconnected":
      case "connection_lost":
        _connected = false;
        _connectionCallback?.({ type: "disconnected" });
        _eventTarget.dispatchEvent(new CustomEvent("mothershipConnectionChanged", {
          detail: { type: "disconnected" }
        }));
        break;

      case "dm_received":
      case "incoming_dm":
        _messageCallback?.(msg);
        _eventTarget.dispatchEvent(new CustomEvent("mothershipDmReceived", { detail: msg }));
        break;

      case "node_assigned":
      case "nearby_node":
        _nodeCallback?.(msg);
        _eventTarget.dispatchEvent(new CustomEvent("mothershipNodeAssigned", { detail: msg }));
        break;

      case "dm_ack":
        _eventTarget.dispatchEvent(new CustomEvent("mothershipDmAck", { detail: msg }));
        break;

      default:
        console.debug("[MotherShip-Web] unhandled message type:", msg.type || msg.action);
    }
  } catch (e) {
    console.warn("[MotherShip-Web] failed to parse message:", e.message);
  }
}

// ── Send a message over the WebSocket ────────────────────────────────────
function send(data) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) {
    console.warn("[MotherShip-Web] cannot send — not connected");
    return false;
  }
  try {
    _ws.send(JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("[MotherShip-Web] send error:", e.message);
    return false;
  }
}

// ── Start heartbeat ──────────────────────────────────────────────────────
function startHeartbeat() {
  stopHeartbeat();
  _heartbeatTimer = setInterval(() => {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      send({ type: "ping", timestamp: Date.now() });
    }
  }, 30000); // every 30 seconds
}

function stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
}

// ── Auto-reconnect with exponential backoff ──────────────────────────────
let _reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function scheduleReconnect() {
  if (_reconnectTimer) return;
  // Exponential backoff: 3s, 6s, 12s, 24s, 30s (capped)
  const delay = Math.min(3000 * Math.pow(2, _reconnectAttempts), 30000);
  _reconnectAttempts++;
  if (_reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.warn("[MotherShip-Web] Max reconnect attempts reached, giving up.");
    return;
  }
  console.log(`[MotherShip-Web] Scheduling reconnect in ${delay}ms (attempt ${_reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    if (_publicKey && !_connected) {
      console.log("[MotherShip-Web] attempting reconnect...");
      connect(_publicKey, _url).catch(() => {});
    }
  }, delay);
}

function resetReconnectCounter() {
  _reconnectAttempts = 0;
}

// ══════════════════════════════════════════════════════════════════════════
//  Public API
// ══════════════════════════════════════════════════════════════════════════

/**
 * Connect to the Mother Ship WebSocket server.
 * @param {string} publicKey — User's public key for identification
 * @param {string} [url] — Mother Ship URL (defaults to production)
 * @returns {Promise<{connected: boolean, mothershipUrl: string}>}
 */
export function connect(publicKey, url = null) {
  return new Promise((resolve, reject) => {
    const mothershipUrl = url || DEFAULT_MOTHERSHIP_URL;
    _publicKey = publicKey;
    _url = mothershipUrl;

    // Close existing connection
    if (_ws) {
      _ws.onclose = null;
      _ws.close();
      _ws = null;
    }

    console.log("[MotherShip-Web] connecting to", mothershipUrl);

    try {
      _ws = new WebSocket(mothershipUrl);
    } catch (e) {
      reject(new Error("Failed to create WebSocket: " + e.message));
      return;
    }

    const timeout = setTimeout(() => {
      console.warn("[MotherShip-Web] Connection timed out after", WS_CONNECT_TIMEOUT, "ms");
      _ws?.close();
      resolve({ connected: false, mothershipUrl, error: `Connection timed out (${WS_CONNECT_TIMEOUT / 1000}s)` });
    }, WS_CONNECT_TIMEOUT);

    _ws.onopen = () => {
      clearTimeout(timeout);
      console.log("[MotherShip-Web] WebSocket opened, sending register...");

      // Register with the Mother Ship
      send({
        type: "register",
        publicKey: publicKey,
        platform: "web",
        timestamp: Date.now(),
      });

      // The server should respond with a "connected" message
      // Give it a moment, then resolve
      setTimeout(() => {
        if (_connected) resetReconnectCounter();
        resolve({ connected: _connected, mothershipUrl });
      }, WS_REGISTER_WAIT);
    };

    _ws.onmessage = handleRawMessage;

    _ws.onerror = (e) => {
      clearTimeout(timeout);
      console.error("[MotherShip-Web] WebSocket error:", e.message || String(e));
      _connected = false;
      resolve({ connected: false, mothershipUrl, error: "WebSocket error" });
      scheduleReconnect();
    };

    _ws.onclose = (e) => {
      clearTimeout(timeout);
      const wasConnected = _connected;
      _connected = false;
      console.log("[MotherShip-Web] WebSocket closed:", e.code, e.reason);

      if (wasConnected) {
        _connectionCallback?.({ type: "disconnected" });
        _eventTarget.dispatchEvent(new CustomEvent("mothershipConnectionChanged", {
          detail: { type: "disconnected" }
        }));
      }

      stopHeartbeat();
      scheduleReconnect();
    };

    startHeartbeat();
  });
}

/**
 * Disconnect from the Mother Ship.
 */
export function disconnect() {
  stopHeartbeat();
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  _reconnectAttempts = 0;
  if (_ws) {
    _ws.onclose = null; // prevent reconnect
    _ws.close();
    _ws = null;
  }
  _connected = false;
  _publicKey = "";
  console.log("[MotherShip-Web] disconnected");
  return { connected: false };
}

/**
 * Get current connection status.
 */
export function getStatus() {
  return {
    connected: _connected,
    mothershipUrl: _url,
    platform: "web",
  };
}

/**
 * Send a DM through the Mother Ship relay.
 */
export function sendDm(recipientId, encryptedContent, messageType, conversationId) {
  const sent = send({
    type: "send_dm",
    recipientId,
    encryptedContent,
    messageType: messageType || "text",
    conversationId: conversationId || "",
    timestamp: Date.now(),
  });
  return sent ? { success: true } : { success: false, error: "Not connected to Mother Ship" };
}

/**
 * Request a nearby Echo Node assignment from the Mother Ship.
 * @returns {Promise<{success: boolean, nodeUrl?: string}>}
 */
export function requestNearbyNode() {
  return new Promise((resolve) => {
    if (!_connected || !_ws || _ws.readyState !== WebSocket.OPEN) {
      resolve({ success: false, error: "Not connected to Mother Ship" });
      return;
    }

    // Listen for the node assignment response
    const handler = (event) => {
      const msg = event.detail;
      _eventTarget.removeEventListener("mothershipNodeAssigned", handler);
      resolve({
        success: true,
        nodeUrl: msg.nodeUrl || msg.url || msg.address || null,
        nodeId: msg.nodeId || null,
        latency: msg.latency || null,
      });
    };
    _eventTarget.addEventListener("mothershipNodeAssigned", handler);

    // Timeout after configured duration
    setTimeout(() => {
      _eventTarget.removeEventListener("mothershipNodeAssigned", handler);
      resolve({ success: false, error: `Node assignment timed out (${NODE_REQUEST_TIMEOUT / 1000}s)` });
    }, NODE_REQUEST_TIMEOUT);

    // Request the node
    send({
      type: "request_nearby_node",
      publicKey: _publicKey,
      timestamp: Date.now(),
    });
  });
}

/**
 * Register callbacks for Mother Ship events.
 * Returns cleanup functions for React useEffect compatibility.
 */
export function setCallbacks({ onMessage, onConnectionChange, onNodeAssigned }) {
  _messageCallback = onMessage || null;
  _connectionCallback = onConnectionChange || null;
  _nodeCallback = onNodeAssigned || null;
}

/**
 * Add event listener (returns handle with .remove() for React compatibility).
 */
export function addListener(eventName, callback) {
  _eventTarget.addEventListener(eventName, (e) => callback(e.detail));
  return {
    remove: () => _eventTarget.removeEventListener(eventName, (e) => callback(e.detail)),
  };
}

/**
 * Check if we're connected.
 */
export function isConnected() {
  return _connected;
}

const motherShipWebClient = {
  connect,
  disconnect,
  getStatus,
  sendDm,
  requestNearbyNode,
  setCallbacks,
  addListener,
  isConnected,
  DEFAULT_MOTHERSHIP_URL,
};

export default motherShipWebClient;
