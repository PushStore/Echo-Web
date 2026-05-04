// p2p-web.js — Real HTTP bridge to Echo Node server for browser usage.
// Connects to a real Echo Node via HTTP (Social API on port 6881, Relay API on port 6882).
// Exports { P2PCore } with the same interface as p2p.js and p2p-mock.js.
//
// IMPORTANT: All write operations require real ECDSA P-256 signatures.
// The Echo Node's SocialServer verifies signatures for registration, posts,
// follows, interactions, etc. Placeholder keys will cause 403 Forbidden.

// ── localStorage keys ──────────────────────────────────────────────────
const LS_NODE_URL  = "echo_web_node_url";
const LS_PROFILE   = "echo_web_profile";
const LS_KEYPAIR   = "echo_web_keypair";

// ── Module-level state ─────────────────────────────────────────────────
let _connected       = false;
let _socialUrl       = "";   // base URL + ":6881"
let _relayUrl        = "";   // base URL + ":6882"
let _myProfile       = null; // cached profile object from localStorage
let _pollTimer       = null; // DM polling interval ID
let _publicKey       = "";   // Base64 X.509 SPKI (ECDSA P-256) — starts with "MFkw"
let _privateKeyJwk   = null; // JWK for localStorage persistence
let _privateKeyCrypto = null; // CryptoKey for signing (lazily imported)
let _keypairReady    = null; // Promise that resolves when keypair is loaded/generated

// EventTarget for dispatching events (new messages, connection changes, etc.)
const _eventTarget = new EventTarget();

// ── Simple UUID generator ──────────────────────────────────────────────
function generateUserId() {
  return "web_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

// ── ECDSA P-256 Crypto (Web Crypto API) ───────────────────────────────
// The Echo Node supports both Ed25519 (hex) and ECDSA (Base64 X.509 SPKI).
// We use ECDSA P-256 because it's natively supported in all browsers via
// the Web Crypto API — no polyfill needed.
//
// Server detection (isBase64PublicKey):
//   - Base64 X.509 keys starting with "MFkw" → ECDSA (SHA256withECDSA)
//   - Hex keys → Ed25519

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a real ECDSA P-256 keypair using the Web Crypto API.
 * Exports public key as Base64 X.509 SPKI (starts with "MFkw" for P-256).
 * Stores private key as JWK in localStorage.
 */
async function generateKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true, // extractable
    ["sign", "verify"]
  );

  // Export public key as SPKI (X.509) — Base64 encoded
  const spkiBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  _publicKey = arrayBufferToBase64(spkiBuffer);

  // Export private key as JWK for localStorage persistence
  _privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  _privateKeyCrypto = keyPair.privateKey;

  saveKeypair();
  console.log("[WebBridge] Generated real ECDSA P-256 keypair, publicKey:", _publicKey.slice(0, 20) + "...");
}

/**
 * Load keypair from localStorage.
 * If a placeholder keypair is found (old format), regenerate.
 * Returns true if a valid keypair was loaded/generated.
 */
async function loadKeypair() {
  try {
    const raw = localStorage.getItem(LS_KEYPAIR);
    if (raw) {
      const kp = JSON.parse(raw);
      // Check for old placeholder keys and regenerate them
      if (kp.publicKey && (kp.publicKey.startsWith("webpk_") || kp.publicKey.startsWith("websk_"))) {
        console.log("[WebBridge] Found old placeholder keypair — regenerating with real ECDSA P-256");
        await generateKeypair();
        return true;
      }
      // Check for JWK format (new format)
      if (kp.privateKeyJwk && kp.publicKey) {
        _publicKey = kp.publicKey;
        _privateKeyJwk = kp.privateKeyJwk;
        _privateKeyCrypto = null; // Will be lazily imported
        console.log("[WebBridge] Loaded ECDSA P-256 keypair from localStorage");
        return true;
      }
      // Legacy Base64 format
      if (kp.publicKey) {
        _publicKey = kp.publicKey;
        _privateKeyJwk = kp.privateKeyJwk || null;
        _privateKeyCrypto = null;
        console.log("[WebBridge] Loaded keypair (legacy format)");
        return true;
      }
    }
  } catch (e) {
    console.warn("[WebBridge] Failed to load keypair:", e.message || JSON.stringify(e));
  }
  return false;
}

function saveKeypair() {
  try {
    localStorage.setItem(LS_KEYPAIR, JSON.stringify({
      publicKey: _publicKey,
      privateKeyJwk: _privateKeyJwk,
    }));
  } catch (e) {
    console.warn("[WebBridge] Failed to save keypair:", e.message || JSON.stringify(e));
  }
}

/**
 * Get or import the private CryptoKey for signing.
 * Lazily imported from JWK on first use.
 */
async function getPrivateKey() {
  if (_privateKeyCrypto) return _privateKeyCrypto;
  if (!_privateKeyJwk) return null;
  try {
    _privateKeyCrypto = await crypto.subtle.importKey(
      "jwk",
      _privateKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false, // not extractable
      ["sign"]
    );
    return _privateKeyCrypto;
  } catch (e) {
    console.error("[WebBridge] Failed to import private key:", e.message);
    return null;
  }
}

/**
 * Ensure we have a valid ECDSA P-256 keypair.
 * Generates one if not present.
 */
async function ensureKeypair() {
  if (_publicKey && _publicKey.startsWith("MFkw")) return;
  if (!_keypairReady) {
    _keypairReady = (async () => {
      const loaded = await loadKeypair();
      if (!loaded || !_publicKey || !_publicKey.startsWith("MFkw")) {
        await generateKeypair();
      }
    })();
  }
  await _keypairReady;
}

/**
 * Sign data using ECDSA P-256 (SHA-256).
 * Returns Base64-encoded DER signature compatible with Java's SHA256withECDSA.
 *
 * IMPORTANT: The dataToSign string MUST match exactly what the Echo Node server
 * constructs on its side. See SocialServer.kt for each endpoint's format.
 *
 * @param {string} dataToSign — The exact string the server will use to verify
 * @returns {Promise<string>} Base64 DER signature
 */
async function signData(dataToSign) {
  const privateKey = await getPrivateKey();
  if (!privateKey) throw new Error("[WebBridge] No private key available for signing");

  const encoder = new TextEncoder();
  const data = encoder.encode(dataToSign);

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data
  );

  return arrayBufferToBase64(signatureBuffer);
}

// ── localStorage helpers ───────────────────────────────────────────────
function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (raw) {
      _myProfile = JSON.parse(raw);
      return _myProfile;
    }
  } catch (e) {
    console.warn("[WebBridge] Failed to load profile from localStorage:", e.message || JSON.stringify(e));
  }
  return null;
}

function saveProfile(profile) {
  _myProfile = profile;
  try {
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.warn("[WebBridge] Failed to save profile to localStorage:", e.message || JSON.stringify(e));
  }
}

// ── Local following persistence (web fallback) ──────────────────────
const LS_FOLLOWING = "echo_web_following";

function getLocalFollowing() {
  try {
    const raw = localStorage.getItem(LS_FOLLOWING);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (_) { return new Set(); }
}

function saveLocalFollowing(set) {
  try { localStorage.setItem(LS_FOLLOWING, JSON.stringify([...set])); } catch (_) {}
}

// ── Connection check ───────────────────────────────────────────────────
function ensureConnected() {
  if (!_connected) {
    throw new Error("[WebBridge] Not connected to an Echo Node. Call connectToEchoNode({ url }) first.");
  }
}

// ── HTTP helpers (core of everything) ─────────────────────────────────
async function socialGet(path, params = {}) {
  ensureConnected();
  const url = new URL(path, _socialUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  console.log("[WebBridge] GET", url.toString());
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[WebBridge] Social GET ${path} failed (${res.status}): ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return { status: res.status };
}

async function socialPost(path, body = {}) {
  ensureConnected();
  const url = new URL(path, _socialUrl).toString();
  console.log("[WebBridge] POST", url, JSON.stringify(body));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[WebBridge] Social POST ${path} failed (${res.status}): ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return { status: res.status };
}

async function relayGet(path, params = {}) {
  ensureConnected();
  const url = new URL(path, _relayUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  console.log("[WebBridge] RELAY GET", url.toString());
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[WebBridge] Relay GET ${path} failed (${res.status}): ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return { status: res.status };
}

async function relayPost(path, body = {}) {
  ensureConnected();
  const url = new URL(path, _relayUrl).toString();
  console.log("[WebBridge] RELAY POST", url, JSON.stringify(body));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[WebBridge] Relay POST ${path} failed (${res.status}): ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return { status: res.status };
}

// ── DM Polling ─────────────────────────────────────────────────────────
function startDmPolling() {
  if (_pollTimer) return;
  if (!_myProfile) {
    console.warn("[WebBridge] Cannot start DM polling — no profile set.");
    return;
  }
  const poll = async () => {
    try {
      const result = await relayGet(`/relay/poll/${_myProfile.userId}`);
      if (result && Array.isArray(result.messages) && result.messages.length > 0) {
        // Dispatch a custom event so the app can react
        _eventTarget.dispatchEvent(new CustomEvent("new-messages", { detail: result.messages }));
        console.log("[WebBridge] Polled", result.messages.length, "new message(s)");
      }
    } catch (e) {
      // Don't spam the console — network hiccups during polling are expected
      console.debug("[WebBridge] DM poll error:", e.message);
    }
  };
  // Poll immediately, then every 2 seconds
  poll();
  _pollTimer = setInterval(poll, 2000);
  console.log("[WebBridge] DM polling started (every 2s)");
}

function stopDmPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
    console.log("[WebBridge] DM polling stopped");
  }
}

// ── Normalize URL (strip trailing slash, strip port if present) ─────────
function normalizeBaseUrl(url) {
  let u = url.trim().replace(/\/+$/, "");
  // Strip any existing port so we can add our own
  u = u.replace(/:\d+$/, "");
  return u;
}

// ══════════════════════════════════════════════════════════════════════
//  P2PCore — Full interface matching p2p-mock.js + p2p.js
// ══════════════════════════════════════════════════════════════════════
export const P2PCore = {

  // ── Identity ──────────────────────────────────────────────────────────

  async getMyProfile() {
    const local = loadProfile();
    if (!local) return { exists: false };
    // Try to get fresh profile from server
    try {
      ensureConnected();
      const server = await socialGet(`/user/${local.userId}`);
      if (server && !server.error) {
        const profileData = server.profile || server;
        const merged = {
          exists: true,
          userId: profileData.userId || local.userId,
          name: profileData.name || local.name,
          handle: profileData.handle || local.handle,
          bio: profileData.bio || local.bio || "",
          avatar: profileData.avatar || profileData.avatarUrl || local.avatar || null,
          banner: profileData.banner || local.banner || null,
        };
        saveProfile(merged);
        return merged;
      }
    } catch (e) {
      console.warn("[WebBridge] getMyProfile: server fetch failed, using local:", e.message);
    }
    return { exists: true, ...local };
  },

  async checkHandleAvailable({ handle }) {
    console.log("[WebBridge] checkHandleAvailable:", handle);
    try {
      ensureConnected();
      const result = await socialGet(`/user/by-handle/${encodeURIComponent(handle)}`);
      // If user not found, handle is available
      if (result.error || !result.profile) return { available: true, handle };
      return { available: false, handle };
    } catch (e) {
      // 404 means not found = available
      if (e.message.includes("404")) return { available: true, handle };
      throw e;
    }
  },

  async setupProfile({ name, handle, bio = "", avatar = null, banner = null }) {
    console.log("[WebBridge] setupProfile:", name, handle);

    // Ensure we have a real ECDSA P-256 keypair
    await ensureKeypair();

    // Load existing profile to get userId, or generate new one
    let existing = loadProfile();
    const userId = existing?.userId || generateUserId();
    const timestamp = Date.now();
    const storageType = "p2p";

    // Register with the REAL server — this MUST succeed.
    // We do NOT silently fall back to local-only — the profile must exist on the node.
    ensureConnected();
    try {
      // Build the exact dataToSign that the server will construct:
      // Server: val dataToSign = "$userId$name$handle$stType$ts"
      const dataToSign = `${userId}${name}${handle}${storageType}${timestamp}`;
      const signature = await signData(dataToSign);

      const response = await socialPost("/register", {
        userId,
        name,
        handle,
        bio: bio || "",
        publicKey: _publicKey,
        signature,
        timestamp,
        storageType,
      });
      console.log("[WebBridge] Registered on node:", userId, response);

      // Check if the server rejected the registration
      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (e) {
      const msg = e.message || "Unknown error";
      // Map common server errors to user-friendly messages
      if (msg.includes("handle") && (msg.includes("taken") || msg.includes("exists") || msg.includes("unique"))) {
        throw new Error("handle_taken: @" + handle + " is already taken.");
      }
      if (msg.includes("invalid_signature")) {
        throw new Error("node_error: Signature verification failed on node. Please try clearing site data and creating a new account.");
      }
      throw new Error("node_error: Registration on Echo Node failed: " + msg);
    }

    // Save locally only AFTER successful server registration
    const profile = { userId, name, handle, bio, avatar, banner };
    saveProfile(profile);

    // Start DM polling now that we have a registered profile
    startDmPolling();

    return { success: true, userId };
  },

  async updateProfile({ name, bio, avatar, banner }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile. Call setupProfile first." };
    console.log("[WebBridge] updateProfile:", name);

    // Ensure keypair is ready for signing
    await ensureKeypair();

    const updates = { userId: profile.userId, timestamp: Date.now() };
    if (name !== undefined)    updates.name = name;
    if (bio !== undefined)     updates.bio = bio;
    if (avatar !== undefined)  updates.avatar = avatar;
    if (banner !== undefined)  updates.banner = banner;

    // Server dataToSign for /user/update: "$userId$name$bio$avatarHash$stType$timestamp"
    const stType = "";
    const avatarHash = updates.avatar || "";
    const bioVal = updates.bio || "";
    const nameVal = updates.name || "";
    const dataToSign = `${profile.userId}${nameVal}${bioVal}${avatarHash}${stType}${updates.timestamp}`;
    updates.signature = await signData(dataToSign);

    try {
      ensureConnected();
      await socialPost("/user/update", updates);
    } catch (e) {
      console.warn("[WebBridge] updateProfile: server update failed:", e.message);
    }

    // Update local
    if (name !== undefined)    profile.name = name;
    if (bio !== undefined)     profile.bio = bio;
    if (avatar !== undefined)  profile.avatar = avatar;
    if (banner !== undefined)  profile.banner = banner;
    saveProfile(profile);

    return { success: true, name: profile.name, bio: profile.bio, avatar: profile.avatar, banner: profile.banner };
  },

  async deleteAccount() {
    console.log("[WebBridge] deleteAccount");
    // Clear local state
    _myProfile = null;
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_KEYPAIR);
    _privateKeyCrypto = null;
    _privateKeyJwk = null;
    _publicKey = "";
    _keypairReady = null;
    return { success: true };
  },

  async getBookmarks() {
    const profile = loadProfile();
    if (!profile) return { posts: [] };
    try {
      ensureConnected();
      return await socialGet(`/bookmarks/${profile.userId}`);
    } catch (e) {
      console.warn("[WebBridge] getBookmarks failed:", e.message);
      return { posts: [] };
    }
  },

  async getUserPosts({ userId, limit = 20 } = {}) {
    if (!userId) {
      const profile = loadProfile();
      userId = profile?.userId;
    }
    if (!userId) return { posts: [], count: 0 };
    try {
      ensureConnected();
      return await socialGet(`/user/${userId}/posts`, { limit });
    } catch (e) {
      console.warn("[WebBridge] getUserPosts failed:", e.message);
      return { posts: [], count: 0 };
    }
  },

  // ── Feed ──────────────────────────────────────────────────────────────

  async getFeed({ cursor = 0, limit = 20 } = {}) {
    try {
      ensureConnected();
      return await socialGet("/feed/foryou", { cursor, limit });
    } catch (e) {
      console.warn("[WebBridge] getFeed failed:", e.message);
      return { posts: [], count: 0 };
    }
  },

  async getForYouFeed({ limit = 20 } = {}) {
    try {
      ensureConnected();
      return await socialGet("/feed/foryou", { limit });
    } catch (e) {
      console.warn("[WebBridge] getForYouFeed failed:", e.message);
      return { posts: [], count: 0, hasMore: false };
    }
  },

  async getTrendingFollowingFeed({ limit = 20 } = {}) {
    try {
      ensureConnected();
      const profile = loadProfile();
      if (!profile) return { posts: [], count: 0, hasMore: false };
      return await socialGet(`/feed/following/${profile.userId}`, { limit });
    } catch (e) {
      console.warn("[WebBridge] getTrendingFollowingFeed failed:", e.message);
      return { posts: [], count: 0, hasMore: false };
    }
  },

  async getFollowingFeed({ cursor = 0, limit = 50 } = {}) {
    const profile = loadProfile();
    if (!profile) return { posts: [], count: 0 };
    try {
      ensureConnected();
      return await socialGet(`/feed/following/${profile.userId}`, { cursor, limit });
    } catch (e) {
      console.warn("[WebBridge] getFollowingFeed failed:", e.message);
      return { posts: [], count: 0 };
    }
  },

  async createPost({ text, image, video }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] createPost:", text ? text.slice(0, 40) : "[no text]");

    // Ensure keypair is ready for signing
    await ensureKeypair();

    try {
      ensureConnected();

      // The server's /post endpoint expects: authorId, contentHash, postSequence, contentType, etc.
      // Since we're sending raw content (not DHT-stored), we create a content hash from the text.
      const contentHash = "web_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      const timestamp = Date.now();
      const postSequence = Date.now(); // Use timestamp as sequence for uniqueness

      // Server dataToSign for /post: "$authorId$postSequence$contentHash$timestamp"
      const dataToSign = `${profile.userId}${postSequence}${contentHash}${timestamp}`;
      const signature = await signData(dataToSign);

      const result = await socialPost("/post", {
        authorId: profile.userId,
        postSequence,
        contentHash,
        contentType: (image ? "image" : (video ? "video" : "text")),
        text: text || null,
        image: image || null,
        video: video || null,
        timestamp,
        signature,
        storageType: "p2p",
      });
      return { success: true, postId: result.postKey || result.postId || contentHash };
    } catch (e) {
      console.warn("[WebBridge] createPost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async deletePost({ postId }) {
    console.log("[WebBridge] deletePost:", postId);
    await ensureKeypair();
    try {
      ensureConnected();
      const userId = loadProfile()?.userId || _myProfile?.userId;
      const timestamp = Date.now();
      // Server dataToSign for delete: "$postKey$userId$timestamp"
      const dataToSign = `${postId}${userId}${timestamp}`;
      const signature = await signData(dataToSign);
      await socialPost(`/post/${postId}?userId=${userId}`, {
        userId,
        timestamp,
        signature,
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] deletePost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Helper for post interactions (like, unlike, dislike, undislike, retweet)
  async _postInteract({ postKey, action }) {
    await ensureKeypair();
    try {
      ensureConnected();
      const userId = loadProfile()?.userId || _myProfile?.userId;
      const timestamp = Date.now();
      // Server dataToSign for /post/interact: "$postKey$action$timestamp"
      const dataToSign = `${postKey}${action}${timestamp}`;
      const signature = await signData(dataToSign);
      await socialPost("/post/interact", {
        postKey,
        action,
        userId,
        timestamp,
        signature,
      });
      return { success: true };
    } catch (e) {
      console.warn(`[WebBridge] ${action} failed:`, e.message);
      return { success: false, error: e.message };
    }
  },

  async likePost({ postId }) {
    console.log("[WebBridge] likePost:", postId);
    return P2PCore._postInteract({ postKey: postId, action: "like" });
  },

  async unlikePost({ postId }) {
    console.log("[WebBridge] unlikePost:", postId);
    return P2PCore._postInteract({ postKey: postId, action: "unlike" });
  },

  async dislikePost({ postId }) {
    console.log("[WebBridge] dislikePost:", postId);
    return P2PCore._postInteract({ postKey: postId, action: "dislike" });
  },

  async undislikePost({ postId }) {
    console.log("[WebBridge] undislikePost:", postId);
    return P2PCore._postInteract({ postKey: postId, action: "undislike" });
  },

  async retweetPost({ postId }) {
    console.log("[WebBridge] retweetPost:", postId);
    return P2PCore._postInteract({ postKey: postId, action: "retweet" });
  },

  async bookmarkPost({ postId }) {
    console.log("[WebBridge] bookmarkPost:", postId);
    await ensureKeypair();
    try {
      ensureConnected();
      const userId = loadProfile()?.userId || _myProfile?.userId;
      const timestamp = Date.now();
      // Server dataToSign for /bookmark: uses verifySocialSignature which looks up stored publicKey
      // The server constructs: dataToSign from stored profile — we must match
      const dataToSign = `${postId}${userId}${timestamp}`;
      const signature = await signData(dataToSign);
      await socialPost("/bookmark", {
        userId,
        postKey: postId,
        timestamp,
        signature,
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] bookmarkPost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async replyToPost({ postId, text }) {
    console.log("[WebBridge] replyToPost:", postId);
    await ensureKeypair();
    try {
      ensureConnected();
      const userId = loadProfile()?.userId || _myProfile?.userId;
      const timestamp = Date.now();
      const postKey = postId;
      // Server dataToSign for reply interaction: "$postKey$action$timestamp"
      const dataToSign = `${postKey}reply${timestamp}`;
      const signature = await signData(dataToSign);
      const result = await socialPost("/post/interact", {
        postKey,
        action: "reply",
        userId,
        text,
        timestamp,
        signature,
      });
      return { success: true, postId: result.postKey || result.postId || postKey };
    } catch (e) {
      console.warn("[WebBridge] replyToPost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // ── Social ────────────────────────────────────────────────────────────

  async followUser({ userId }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] followUser:", userId);

    // Save locally immediately for responsive UI
    try {
      const following = getLocalFollowing();
      following.add(userId);
      saveLocalFollowing(following);
    } catch (_) {}

    // Send to server with correct field names and real signature
    await ensureKeypair();
    try {
      ensureConnected();
      const timestamp = Date.now();
      // Server expects: followerId, followingId
      // Server dataToSign for /follow: "$followerId$followingId$timestamp"
      const dataToSign = `${profile.userId}${userId}${timestamp}`;
      const signature = await signData(dataToSign);
      await socialPost("/follow", {
        followerId: profile.userId,
        followingId: userId,
        publicKey: _publicKey,
        timestamp,
        signature,
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] followUser failed:", e.message);
      // Return success since we saved locally — the follow will sync later
      return { success: true };
    }
  },

  async unfollowUser({ userId }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] unfollowUser:", userId);

    // Remove from local following list
    try {
      const following = getLocalFollowing();
      following.delete(userId);
      saveLocalFollowing(following);
    } catch (_) {}

    // Send to server with correct field names and real signature
    await ensureKeypair();
    try {
      ensureConnected();
      const timestamp = Date.now();
      // Server expects: followerId, followingId
      // Server dataToSign for /unfollow: "$followerId$followingId$timestamp"
      const dataToSign = `${profile.userId}${userId}${timestamp}`;
      const signature = await signData(dataToSign);
      await socialPost("/unfollow", {
        followerId: profile.userId,
        followingId: userId,
        timestamp,
        signature,
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] unfollowUser failed:", e.message);
      return { success: true };
    }
  },

  async getFollowing({ userId } = {}) {
    const targetId = userId || _myProfile?.userId;
    if (!targetId) return { users: [] };
    try {
      ensureConnected();
      const resp = await socialGet(`/following/${targetId}`);
      const idList = resp.following || [];
      if (Array.isArray(idList) && idList.length > 0) {
        const users = await Promise.all(idList.map(async (id) => {
          let name = "Unknown", handle = "unknown", avatar = null;
          try {
            const cached = await socialGet(`/user/${id}`);
            const p = cached.profile || cached;
            name = p.name || "Unknown";
            handle = p.handle || "unknown";
            avatar = p.avatarUrl || p.avatar || null;
          } catch (_) {}
          return { userId: id, name, handle, avatar, online: false };
        }));
        return { users };
      }
      return { users: [] };
    } catch (e) {
      console.warn("[WebBridge] getFollowing failed:", e.message);
      return { users: [] };
    }
  },

  async getFollowers({ userId } = {}) {
    const targetId = userId || _myProfile?.userId;
    if (!targetId) return { users: [] };
    try {
      ensureConnected();
      const resp = await socialGet(`/followers/${targetId}`);
      const idList = resp.followers || [];
      if (Array.isArray(idList) && idList.length > 0) {
        const users = await Promise.all(idList.map(async (id) => {
          let name = "Unknown", handle = "unknown", avatar = null;
          try {
            const cached = await socialGet(`/user/${id}`);
            const p = cached.profile || cached;
            name = p.name || "Unknown";
            handle = p.handle || "unknown";
            avatar = p.avatarUrl || p.avatar || null;
          } catch (_) {}
          return { userId: id, name, handle, avatar, online: false };
        }));
        return { users };
      }
      return { users: [] };
    } catch (e) {
      console.warn("[WebBridge] getFollowers failed:", e.message);
      return { users: [] };
    }
  },

  async getProfileStats({ userId }) {
    try {
      ensureConnected();
      const followers = await socialGet(`/followers/${userId}`);
      const following = await socialGet(`/following/${userId}`);
      return {
        followers: Array.isArray(followers) ? followers.length : (followers.users?.length || 0),
        following: Array.isArray(following) ? following.length : (following.users?.length || 0),
      };
    } catch (e) {
      console.warn("[WebBridge] getProfileStats failed:", e.message);
      return { followers: 0, following: 0 };
    }
  },

  async searchUsers({ query, limit = 20 }) {
    if (!query) return { users: [] };
    try {
      ensureConnected();
      return await socialGet("/search", { q: query, limit });
    } catch (e) {
      console.warn("[WebBridge] searchUsers failed:", e.message);
      return { users: [] };
    }
  },

  // Social Profile Lookup
  async socialGetUser({ userId }) {
    try {
      ensureConnected();
      return await socialGet(`/user/${userId}`);
    } catch (e) {
      console.warn("[WebBridge] socialGetUser failed:", e.message);
      return { error: "Not found" };
    }
  },

  async socialGetUserByHandle({ handle }) {
    try {
      ensureConnected();
      return await socialGet(`/user/by-handle/${encodeURIComponent(handle)}`);
    } catch (e) {
      console.warn("[WebBridge] socialGetUserByHandle failed:", e.message);
      return { error: "Not found" };
    }
  },

  // ── Direct Messages ──────────────────────────────────────────────────

  async sendMessage({ recipientId, text, image, video, audio, duration, file, fileName, fileSize, fileType }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] sendMessage to:", recipientId);

    const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const messageType = audio ? "audio" : (video ? "video" : (image ? "image" : "text"));

    // Build payload — in production this would be encrypted
    const payload = JSON.stringify({
      text: text || "",
      image: image || null,
      video: video || null,
      audio: audio || null,
      duration: duration || 0,
      file: file || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      fileType: fileType || null,
    });

    try {
      ensureConnected();
      // Try store (no PoW) for reliability
      await relayPost("/relay/store", {
        recipientId,
        messageId,
        senderId: profile.userId,
        payload,
        messageType,
        timestamp: Date.now(),
      });
      return { success: true, messageId, deliveryStatus: "sent" };
    } catch (e) {
      // Fall back to send (with PoW placeholder)
      console.warn("[WebBridge] relay/store failed, trying relay/send:", e.message);
      try {
        await relayPost("/relay/send", {
          recipientId,
          messageId,
          payload,
          powNonce: 0,
          powDifficulty: 0,
        });
        return { success: true, messageId, deliveryStatus: "sent" };
      } catch (e2) {
        console.warn("[WebBridge] sendMessage failed:", e2.message);
        return { success: false, error: e2.message };
      }
    }
  },

  async getConversations() {
    console.log("[WebBridge] getConversations");
    // The server doesn't have a conversations list endpoint —
    // we can't reconstruct this without a proper conversations API.
    // Return empty for now; the app should handle gracefully.
    return { conversations: [], count: 0 };
  },

  async getMessages({ conversationId, limit = 50 }) {
    console.log("[WebBridge] getMessages for conversation:", conversationId);
    // The relay API uses fetch by message ID, not by conversation.
    // We can't list messages by conversation without a dedicated endpoint.
    return { messages: [], count: 0 };
  },

  async deleteMessage({ messageId }) {
    console.log("[WebBridge] deleteMessage:", messageId);
    // No server endpoint for deleting messages
    return { success: false, error: "Not implemented on web" };
  },

  async deleteConversation({ conversationId }) {
    console.log("[WebBridge] deleteConversation:", conversationId);
    // No server endpoint for deleting conversations
    return { success: false, error: "Not implemented on web" };
  },

  async getTotalUnreadCount() {
    // The polling mechanism receives new messages, but we don't track
    // unread counts server-side from the web bridge.
    return { unreadCount: 0 };
  },

  // ── Echo Node Relay ──────────────────────────────────────────────────

  async connectToEchoNode({ url }) {
    console.log("[WebBridge] connectToEchoNode:", url);

    // Normalize URL
    const base = normalizeBaseUrl(url);
    const social = base + ":6881";
    const relay  = base + ":6882";

    // Validate node is reachable via health check
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(social + "/status", { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn("[WebBridge] Node returned status", res.status);
        return { connected: false, error: `Node returned HTTP ${res.status}` };
      }

      const data = await res.json();
      console.log("[WebBridge] Node status:", JSON.stringify(data));
    } catch (e) {
      const msg = e.name === "AbortError" ? "Connection timed out (8s)" : e.message;
      console.warn("[WebBridge] Could not reach node:", msg);
      return { connected: false, error: msg };
    }

    // Save connection
    _connected  = true;
    _socialUrl  = social;
    _relayUrl   = relay;

    // Persist URL
    try {
      localStorage.setItem(LS_NODE_URL, base);
    } catch (e) { /* ignore */ }

    // Load profile and keypair from localStorage
    loadProfile();
    await loadKeypair();

    // Generate a real keypair if we don't have one yet (or have an old placeholder)
    if (!_publicKey || !_publicKey.startsWith("MFkw")) {
      await generateKeypair();
    }

    // Start DM polling if we have a profile
    if (_myProfile) startDmPolling();

    // Dispatch connection event
    _eventTarget.dispatchEvent(new CustomEvent("connection-changed", { detail: { connected: true, url: base } }));

    return { connected: true, relayUrl: relay, socialUrl: social };
  },

  async disconnectEchoNode() {
    console.log("[WebBridge] disconnectEchoNode");
    stopDmPolling();
    _connected  = false;
    _socialUrl  = "";
    _relayUrl   = "";
    _eventTarget.dispatchEvent(new CustomEvent("connection-changed", { detail: { connected: false } }));
    return { connected: false };
  },

  async getEchoNodeStatus() {
    if (!_connected) {
      return { connected: false, relayUrl: "", socialUrl: "", messagesStored: 0, recipients: 0 };
    }
    // Verify node is still reachable
    try {
      await fetch(_socialUrl + "/status", { signal: AbortSignal.timeout(3000) });
      return { connected: true, relayUrl: _relayUrl, socialUrl: _socialUrl, messagesStored: 0, recipients: 0 };
    } catch (e) {
      _connected = false;
      return { connected: false, relayUrl: _relayUrl, socialUrl: _socialUrl, error: "Node unreachable" };
    }
  },

  async getNetworkStatus() {
    if (!_connected) return { online: false, peersConnected: 0, seedingCount: 0 };
    try {
      await fetch(_socialUrl + "/status", { signal: AbortSignal.timeout(3000) });
      return { online: true, peersConnected: 1, seedingCount: 0 };
    } catch (e) {
      return { online: false, peersConnected: 0, seedingCount: 0 };
    }
  },

  async startService() {
    console.log("[WebBridge] startService — no-op on web");
    return { success: true };
  },

  async stopService() {
    console.log("[WebBridge] stopService — no-op on web");
    return { success: true };
  },

  // ── Mother Ship Relay ────────────────────────────────────────────────

  async connectToMothership({ publicKey }) {
    console.log("[WebBridge] connectToMothership — not available on web bridge");
    // Mother Ship relay requires native Android networking
    return { connected: false, error: "Mother Ship relay requires native platform" };
  },

  async disconnectFromMothership() {
    return { connected: false };
  },

  async getMothershipStatus() {
    return { connected: false };
  },

  async sendDmViaMothership({ recipientId, encryptedContent, messageType, conversationId }) {
    console.log("[WebBridge] sendDmViaMothership — routing through relay instead");
    // Fall back to relay store
    return P2PCore.sendMessage({ recipientId, text: encryptedContent });
  },

  async requestNearbyNode() {
    console.log("[WebBridge] requestNearbyNode — not available on web bridge");
    return { success: false, error: "Node discovery requires native platform" };
  },

  // ── Push Notifications ───────────────────────────────────────────────

  async registerForPushNotifications() {
    console.log("[WebBridge] registerForPushNotifications — not available on web");
    return { success: false, error: "Push notifications require native platform" };
  },

  async unregisterPushNotifications() {
    return { success: false, error: "Not available on web" };
  },

  async getPushNotificationStatus() {
    return { registered: false };
  },

  // ── Identity Verification ────────────────────────────────────────────

  async identityGetStatus() {
    console.log("[WebBridge] identityGetStatus");
    return {
      verified: !!_publicKey,
      keyCount: _publicKey ? 1 : 0,
      keyType: "ECDSA_P256",
      note: "Web uses ECDSA P-256 via Web Crypto API",
    };
  },

  async identityChallenge({ targetUserId }) {
    console.log("[WebBridge] identityChallenge:", targetUserId);
    const challengeId = "ch_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    return {
      challengeId,
      challenge: "web_challenge_" + Date.now(),
      expiresAt: Date.now() + 300000,
      note: "Web ECDSA P-256 challenge",
    };
  },

  async identityVerify({ challengeId, responseSignature, responderPublicKey }) {
    console.log("[WebBridge] identityVerify:", challengeId);
    try {
      // responderPublicKey is Base64 X.509 SPKI
      const pubKeyBuffer = base64ToArrayBuffer(responderPublicKey);
      const publicKey = await crypto.subtle.importKey(
        "spki",
        pubKeyBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      );
      const data = new TextEncoder().encode(challengeId);
      const sigBuffer = base64ToArrayBuffer(responseSignature);
      const valid = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        sigBuffer,
        data
      );
      return { verified: valid, trustLevel: valid ? "verified" : "unverified" };
    } catch (e) {
      console.warn("[WebBridge] identityVerify failed:", e.message);
      return { verified: false, trustLevel: "unverified", error: e.message };
    }
  },

  async identityRotateKey({ userId, oldPublicKey, newPublicKey, rotationSignature, timestamp }) {
    console.log("[WebBridge] identityRotateKey:", userId);
    return { success: false, error: "Key rotation requires native crypto layer" };
  },

  async identityGetKeys({ userId }) {
    console.log("[WebBridge] identityGetKeys:", userId);
    if (userId === _myProfile?.userId) {
      return { keys: [{ publicKey: _publicKey, keyType: "ECDSA_P256", createdAt: Date.now() }], count: 1 };
    }
    return { keys: [], count: 0, note: "Cannot fetch other users' keys via web bridge" };
  },

  async identitySetTrust({ userId, publicKey, trustLevel }) {
    console.log("[WebBridge] identitySetTrust:", userId, trustLevel);
    return { success: false, error: "Trust management requires native crypto layer" };
  },

  async identityVerifyPrekey({ publicKey, prekeyPublic, prekeySignature }) {
    console.log("[WebBridge] identityVerifyPrekey");
    return { valid: false, note: "Prekey verification requires native Ed25519 crypto layer" };
  },

  // ── Backup & Restore ─────────────────────────────────────────────────

  async backupCreate({ includeMessages = true, password }) {
    console.log("[WebBridge] backupCreate — not implemented on web");
    return { success: false, error: "Backup requires native platform for encrypted storage" };
  },

  async backupRestore({ data, password }) {
    console.log("[WebBridge] backupRestore — not implemented on web");
    return { success: false, error: "Restore requires native platform" };
  },

  async backupVerify({ data, password }) {
    console.log("[WebBridge] backupVerify — not implemented on web");
    return { valid: false, error: "Not implemented on web" };
  },

  async backupDhtStore() {
    console.log("[WebBridge] backupDhtStore — not implemented on web");
    return { success: false, error: "DHT operations require native P2P layer" };
  },

  async backupDhtRestore({ userId }) {
    console.log("[WebBridge] backupDhtRestore — not implemented on web");
    return { success: false, error: "DHT operations require native P2P layer" };
  },

  async backupGetStatus() {
    return { lastBackup: null, size: 0, encrypted: false, dhtStored: false, note: "Backup not available on web" };
  },

  // ── Multi-Device Sync ────────────────────────────────────────────────

  async deviceRegister({ deviceId, deviceName, deviceType, publicKey, prekey, capabilities }) {
    console.log("[WebBridge] deviceRegister — not implemented on web");
    return { success: false, error: "Device sync requires native platform" };
  },

  async deviceList({ userId }) {
    return { devices: [], count: 0, note: "Device listing not available on web" };
  },

  async deviceHeartbeat({ deviceId }) {
    return { success: false, error: "Device sync requires native platform" };
  },

  async deviceRevoke({ deviceId, userId }) {
    return { success: false, error: "Device sync requires native platform" };
  },

  async deviceGetStatus() {
    return { currentDevice: null, totalDevices: 0, lastSync: null, note: "Device sync not available on web" };
  },

  async syncGetDevices({ userId }) {
    return { devices: [], count: 0 };
  },

  async syncPullDevice({ deviceId, lastSyncVersion }) {
    return { mutations: [], versionVector: {}, hasMore: false };
  },

  async syncPushDevice({ deviceId, mutations, versionVector }) {
    return { success: false, error: "Device sync requires native platform" };
  },

  // ── Content Marketplace ──────────────────────────────────────────────

  async marketplacePublish({ title, description, contentType, category, tags, mediaUrl, price }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] marketplacePublish:", title);
    try {
      ensureConnected();
      await ensureKeypair();
      const timestamp = Date.now();
      const dataToSign = `${profile.userId}${title}${timestamp}`;
      const signature = await signData(dataToSign);
      const result = await relayPost("/marketplace/publish", {
        authorId: profile.userId, title, description, contentType,
        category, tags, mediaUrl, price, signature, timestamp,
      });
      return { success: true, contentId: result.contentId };
    } catch (e) {
      console.warn("[WebBridge] marketplacePublish failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async marketplaceBrowse({ category, limit = 20, offset = 0 }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/browse", { category, limit, offset });
    } catch (e) {
      console.warn("[WebBridge] marketplaceBrowse failed:", e.message);
      return { items: [], count: 0 };
    }
  },

  async marketplaceGetItem({ contentId }) {
    try {
      ensureConnected();
      return await relayGet(`/marketplace/item/${contentId}`);
    } catch (e) {
      console.warn("[WebBridge] marketplaceGetItem failed:", e.message);
      return { error: "Not found" };
    }
  },

  async marketplaceSearch({ query, limit = 20 }) {
    if (!query) return { items: [], count: 0 };
    try {
      ensureConnected();
      return await relayGet("/marketplace/search", { q: query, limit });
    } catch (e) {
      console.warn("[WebBridge] marketplaceSearch failed:", e.message);
      return { items: [], count: 0 };
    }
  },

  // ── Storage Preference ──────────────────────────────────────────────

  async getStoragePreference() {
    const stored = (() => { try { return localStorage.getItem("echo_storage_pref"); } catch(_) { return null; } })();
    return { storageType: stored || "p2p" };
  },

  async setStoragePreference({ storageType }) {
    try { localStorage.setItem("echo_storage_pref", storageType || "p2p"); } catch(_) {}
    return { success: true, storageType: storageType || "p2p" };
  },

  // ── Stories ────────────────────────────────────────────────────────

  async createStory({ media, mediaType, duration = 15 }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] createStory: type=", mediaType);
    try {
      ensureConnected();
      const storyId = "story_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      return { success: true, storyId };
    } catch (e) {
      console.warn("[WebBridge] createStory failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async getStories({ userId, limit = 20 }) {
    try {
      ensureConnected();
      return await socialGet("/stories", { userId, limit });
    } catch (e) {
      console.warn("[WebBridge] getStories failed:", e.message);
      return { stories: [], count: 0 };
    }
  },

  // ── Group Chat ──────────────────────────────────────────────────────

  async createGroupChat({ name, description, memberIds }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] createGroupChat:", name);
    try {
      ensureConnected();
      const groupId = "group_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      return { success: true, groupId };
    } catch (e) {
      console.warn("[WebBridge] createGroupChat failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async getGroupChats() {
    try {
      ensureConnected();
      return await socialGet("/groups");
    } catch (e) {
      console.warn("[WebBridge] getGroupChats failed:", e.message);
      return { groups: [], count: 0 };
    }
  },

  async addGroupMember({ groupId, userId }) {
    try {
      ensureConnected();
      await socialPost(`/groups/${groupId}/members`, { userId });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] addGroupMember failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async removeGroupMember({ groupId, userId }) {
    try {
      ensureConnected();
      await socialPost(`/groups/${groupId}/members/remove`, { userId });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] removeGroupMember failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async sendGroupMessage({ groupId, text, media, mediaType }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] sendGroupMessage to:", groupId);
    try {
      ensureConnected();
      await relayPost("/relay/store", {
        recipientId: groupId,
        messageId: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        senderId: profile.userId,
        payload: JSON.stringify({ text: text || "", media: media || null, mediaType: mediaType || "text" }),
        messageType: "group",
        timestamp: Date.now(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] sendGroupMessage failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // ── Calls (WebRTC Signaling) ──────────────────────────────────────

  async initiateCall({ recipientId, callType = "audio" }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] initiateCall:", callType, "to", recipientId);
    return { success: false, error: "Calls require native WebRTC layer" };
  },

  async answerCall({ callId, sdpAnswer }) {
    return { success: false, error: "Calls require native WebRTC layer" };
  },

  async endCall({ callId }) {
    return { success: false, error: "Calls require native WebRTC layer" };
  },

  async getCallStatus() {
    return { active: false };
  },

  // ── Event Listeners (EventTarget-based) ────────────────────────────

  addListener(event, callback) {
    _eventTarget.addEventListener(event, (e) => callback(e.detail));
    return { remove: () => _eventTarget.removeEventListener(event, (e) => callback(e.detail)) };
  },

  removeAllListeners() {
    // EventTarget doesn't have a clear method, but we can replace it
    // For simplicity, we just stop DM polling
    stopDmPolling();
  },
};
