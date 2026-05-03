// p2p-web.js — Real HTTP bridge to Echo Node server for browser usage.
// Connects to a real Echo Node via HTTP (Social API on port 6881, Relay API on port 6882).
// Exports { P2PCore } with the same interface as p2p.js and p2p-mock.js.

// ── localStorage keys ──────────────────────────────────────────────────
const LS_NODE_URL  = "echo_web_node_url";
const LS_PROFILE   = "echo_web_profile";
const LS_KEYPAIR   = "echo_web_keypair";

// ── Module-level state ─────────────────────────────────────────────────
let _connected    = false;
let _socialUrl    = "";   // base URL + ":6881"
let _relayUrl     = "";   // base URL + ":6882"
let _myProfile    = null; // cached profile object from localStorage
let _pollTimer    = null; // DM polling interval ID
let _publicKey    = "";
let _privateKey   = "";  // TODO: replace placeholder with proper Ed25519 keypair

// EventTarget for dispatching events (new messages, connection changes, etc.)
const _eventTarget = new EventTarget();

// ── Simple UUID generator ──────────────────────────────────────────────
function generateUserId() {
  return "web_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

// ── Signature placeholder ──────────────────────────────────────────────
// TODO: Implement proper Ed25519 signing using SubtleCrypto or a polyfill.
// For now we use the public key as a placeholder signature since the full
// crypto verification requires the native layer.
function getSignature() {
  return _publicKey || "web_placeholder_sig";
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

function loadKeypair() {
  try {
    const raw = localStorage.getItem(LS_KEYPAIR);
    if (raw) {
      const kp = JSON.parse(raw);
      _publicKey  = kp.publicKey  || "";
      _privateKey = kp.privateKey || "";
    }
  } catch (e) {
    console.warn("[WebBridge] Failed to load keypair:", e.message || JSON.stringify(e));
  }
}

function saveKeypair() {
  try {
    localStorage.setItem(LS_KEYPAIR, JSON.stringify({ publicKey: _publicKey, privateKey: _privateKey }));
  } catch (e) {
    console.warn("[WebBridge] Failed to save keypair:", e.message || JSON.stringify(e));
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

function generateKeypair() {
  // TODO: Replace with real Ed25519 key generation via SubtleCrypto
  _publicKey  = "webpk_" + generateUserId();
  _privateKey = "websk_" + generateUserId();
  saveKeypair();
  console.log("[WebBridge] Generated keypair (placeholder), publicKey:", _publicKey.slice(0, 16) + "...");
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
        const merged = {
          exists: true,
          userId: server.userId || local.userId,
          name: server.name || local.name,
          handle: server.handle || local.handle,
          bio: server.bio || local.bio || "",
          avatar: server.avatar || local.avatar || null,
          banner: server.banner || local.banner || null,
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
      if (result.error || !result.userId) return { available: true, handle };
      return { available: false, handle };
    } catch (e) {
      // 404 means not found = available
      if (e.message.includes("404")) return { available: true, handle };
      throw e;
    }
  },

  async setupProfile({ name, handle, bio = "", avatar = null, banner = null }) {
    console.log("[WebBridge] setupProfile:", name, handle);

    // Load or generate keypair
    loadKeypair();
    if (!_publicKey) generateKeypair();

    // Load existing profile to get userId, or generate new one
    let existing = loadProfile();
    const userId = existing?.userId || generateUserId();
    const timestamp = Date.now();

    // Register with the server
    try {
      ensureConnected();
      await socialPost("/register", {
        userId,
        name,
        handle,
        bio: bio || "",
        publicKey: _publicKey,
        signature: getSignature(),
        timestamp,
      });
      console.log("[WebBridge] Registered on node:", userId);
    } catch (e) {
      console.warn("[WebBridge] setupProfile: registration failed:", e.message);
      // Continue — we still save locally so the user can operate
    }

    // Save locally
    const profile = { userId, name, handle, bio, avatar, banner };
    saveProfile(profile);

    // Start DM polling now that we have a profile
    startDmPolling();

    return { success: true, userId };
  },

  async updateProfile({ name, bio, avatar, banner }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile. Call setupProfile first." };
    console.log("[WebBridge] updateProfile:", name);

    const updates = { userId: profile.userId, signature: getSignature(), timestamp: Date.now() };
    if (name !== undefined)    updates.name = name;
    if (bio !== undefined)     updates.bio = bio;
    if (avatar !== undefined)  updates.avatar = avatar;
    if (banner !== undefined)  updates.banner = banner;

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
    try {
      ensureConnected();
      const result = await socialPost("/post", {
        userId: profile.userId,
        text: text || null,
        image: image || null,
        video: video || null,
        timestamp: Date.now(),
        signature: getSignature(),
      });
      return { success: true, postId: result.postKey || result.postId || "unknown" };
    } catch (e) {
      console.warn("[WebBridge] createPost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async deletePost({ postId }) {
    console.log("[WebBridge] deletePost:", postId);
    try {
      ensureConnected();
      // The server API doesn't have an explicit delete endpoint listed,
      // but we can try a POST interact with action "delete"
      await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "delete",
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] deletePost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async likePost({ postId }) {
    console.log("[WebBridge] likePost:", postId);
    try {
      ensureConnected();
      await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "like",
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] likePost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async unlikePost({ postId }) {
    console.log("[WebBridge] unlikePost:", postId);
    try {
      ensureConnected();
      await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "unlike",
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] unlikePost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async dislikePost({ postId }) {
    console.log("[WebBridge] dislikePost:", postId);
    try {
      ensureConnected();
      await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "dislike",
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] dislikePost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async undislikePost({ postId }) {
    console.log("[WebBridge] undislikePost:", postId);
    try {
      ensureConnected();
      await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "undislike",
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] undislikePost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async retweetPost({ postId }) {
    console.log("[WebBridge] retweetPost:", postId);
    try {
      ensureConnected();
      await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "retweet",
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] retweetPost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async bookmarkPost({ postId }) {
    console.log("[WebBridge] bookmarkPost:", postId);
    try {
      ensureConnected();
      await socialPost("/bookmark", {
        userId: _myProfile?.userId,
        postId,
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] bookmarkPost failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async replyToPost({ postId, text }) {
    console.log("[WebBridge] replyToPost:", postId);
    try {
      ensureConnected();
      const result = await socialPost("/post/interact", {
        userId: _myProfile?.userId,
        postId,
        action: "reply",
        text,
        signature: getSignature(),
      });
      return { success: true, postId: result.postKey || result.postId || "unknown" };
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
    try {
      const following = getLocalFollowing();
      following.add(userId);
      saveLocalFollowing(following);
    } catch (_) {}
    try {
      ensureConnected();
      await socialPost("/follow", {
        userId: profile.userId,
        targetUserId: userId,
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      console.warn("[WebBridge] followUser failed:", e.message);
      return { success: true };
    }
  },

  async unfollowUser({ userId }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] unfollowUser:", userId);
    try {
      const following = getLocalFollowing();
      following.delete(userId);
      saveLocalFollowing(following);
    } catch (_) {}
    try {
      ensureConnected();
      await socialPost("/unfollow", {
        userId: profile.userId,
        targetUserId: userId,
        signature: getSignature(),
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
    loadKeypair();
    if (!_publicKey) generateKeypair();

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
    console.log("[WebBridge] identityGetStatus — not fully implemented on web");
    return {
      verified: false,
      keyCount: _publicKey ? 1 : 0,
      note: "Identity verification requires native Ed25519 crypto layer",
    };
  },

  async identityChallenge({ targetUserId }) {
    console.log("[WebBridge] identityChallenge:", targetUserId);
    // TODO: Implement challenge generation with proper crypto
    const challengeId = "ch_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    return {
      challengeId,
      challenge: "web_challenge_" + Date.now(),
      expiresAt: Date.now() + 300000,
      note: "Placeholder — verification requires native crypto",
    };
  },

  async identityVerify({ challengeId, responseSignature, responderPublicKey }) {
    console.log("[WebBridge] identityVerify:", challengeId);
    // TODO: Verify response signature with proper Ed25519
    return {
      verified: false,
      trustLevel: "unverified",
      note: "Signature verification requires native Ed25519 crypto layer",
    };
  },

  async identityRotateKey({ userId, oldPublicKey, newPublicKey, rotationSignature, timestamp }) {
    console.log("[WebBridge] identityRotateKey:", userId);
    // TODO: Implement with proper key rotation
    return { success: false, error: "Key rotation requires native crypto layer" };
  },

  async identityGetKeys({ userId }) {
    console.log("[WebBridge] identityGetKeys:", userId);
    if (userId === _myProfile?.userId) {
      return { keys: [{ publicKey: _publicKey, createdAt: Date.now() }], count: 1 };
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
      const result = await relayPost("/marketplace/publish", {
        authorId: profile.userId, title, description, contentType,
        category, tags, mediaUrl, price, signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, contentId: result.contentId };
    } catch (e) {
      console.warn("[WebBridge] marketplacePublish failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  async marketplaceGetContent({ contentId }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/content/" + contentId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async marketplaceSearch({ query, offset = 0, limit = 20 }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/search", { q: query, offset, limit });
    } catch (e) {
      return { items: [], count: 0, total: 0, offset, limit };
    }
  },

  async marketplaceGetByCategory({ category, offset = 0, limit = 20 }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/category/" + category, { offset, limit });
    } catch (e) {
      return { items: [], count: 0, category };
    }
  },

  async marketplaceGetByTag({ tag, offset = 0, limit = 20 }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/tag/" + tag, { offset, limit });
    } catch (e) {
      return { items: [], count: 0, tag };
    }
  },

  async marketplaceGetTrending({ category, limit = 10 }) {
    try {
      ensureConnected();
      const params = { limit };
      if (category) params.category = category;
      return await relayGet("/marketplace/trending", params);
    } catch (e) {
      return { items: [], count: 0 };
    }
  },

  async marketplaceGetByAuthor({ authorId, offset = 0, limit = 20 }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/author/" + authorId, { offset, limit });
    } catch (e) {
      return { items: [], count: 0 };
    }
  },

  async marketplaceCreateCollection({ name, description, contentIds, isPublic = true }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    try {
      ensureConnected();
      const result = await relayPost("/marketplace/collection/create", {
        name, description, contentIds, isPublic, authorId: profile.userId,
        signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, collectionId: result.collectionId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async marketplaceGetCollection({ collectionId }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/collection/" + collectionId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async marketplaceAddToCollection({ collectionId, contentId }) {
    try {
      ensureConnected();
      await relayPost("/marketplace/collection/add", { collectionId, contentId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async marketplaceCreatorStats({ authorId }) {
    try {
      ensureConnected();
      return await relayGet("/marketplace/creator/stats/" + authorId);
    } catch (e) {
      return { totalItems: 0, totalDownloads: 0, totalRevenue: 0 };
    }
  },

  async marketplaceGetStats() {
    try {
      ensureConnected();
      return await relayGet("/marketplace/stats");
    } catch (e) {
      return { totalItems: 0, totalCollections: 0, totalDownloads: 0 };
    }
  },

  // ── Group Chat ───────────────────────────────────────────────────────

  async groupCreate({ name, description, maxMembers, avatarUrl, creatorId }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] groupCreate:", name);
    try {
      ensureConnected();
      const result = await relayPost("/groups/create", {
        name, description, maxMembers, avatarUrl,
        creatorId: creatorId || profile.userId,
        signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, groupId: result.groupId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupGet({ groupId }) {
    try {
      ensureConnected();
      return await relayGet("/groups/" + groupId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupUpdate({ groupId, name, description, avatarUrl }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/update", {
        name, description, avatarUrl, signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupDelete({ groupId }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/delete", { signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupJoin({ groupId }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/join", { userId: profile.userId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupLeave({ groupId }) {
    const profile = loadProfile();
    if (!profile) return { success: false };
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/leave", { userId: profile.userId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupKick({ groupId, userId }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/kick", { userId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupBan({ groupId, userId }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/ban", { userId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupUnban({ groupId, userId }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/unban", { userId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupSetRole({ groupId, userId, role }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/role", { userId, role, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupGetMembers({ groupId }) {
    try {
      ensureConnected();
      return await relayGet("/groups/" + groupId + "/members");
    } catch (e) {
      return { members: [], count: 0 };
    }
  },

  async groupSendMessage({ groupId, encryptedContent, messageType, mediaUrl }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    try {
      ensureConnected();
      const result = await relayPost("/groups/" + groupId + "/messages", {
        senderId: profile.userId, encryptedContent, messageType, mediaUrl,
        signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, messageId: result.messageId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupGetMessages({ groupId, offset = 0, limit = 50 }) {
    try {
      ensureConnected();
      return await relayGet("/groups/" + groupId + "/messages", { offset, limit });
    } catch (e) {
      return { messages: [], count: 0, hasMore: false };
    }
  },

  async groupDeleteMessage({ groupId, messageId }) {
    try {
      ensureConnected();
      await relayPost("/groups/" + groupId + "/messages/" + messageId + "/delete", { signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupCreateInvite({ groupId, expiresInHours = 24, maxUses = 100 }) {
    try {
      ensureConnected();
      const result = await relayPost("/groups/" + groupId + "/invites", {
        expiresInHours, maxUses, signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, inviteCode: result.inviteCode };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupJoinByInvite({ inviteCode }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    try {
      ensureConnected();
      const result = await relayPost("/groups/invites/" + inviteCode + "/join", {
        userId: profile.userId, signature: getSignature(),
      });
      return { success: true, groupId: result.groupId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupGetInvite({ inviteCode }) {
    try {
      ensureConnected();
      return await relayGet("/groups/invites/" + inviteCode);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async groupGetMy() {
    const profile = loadProfile();
    if (!profile) return { groups: [], count: 0 };
    try {
      ensureConnected();
      return await relayGet("/groups/my/" + profile.userId);
    } catch (e) {
      return { groups: [], count: 0 };
    }
  },

  async groupSearch({ query }) {
    try {
      ensureConnected();
      return await relayGet("/groups/search", { q: query });
    } catch (e) {
      return { groups: [], count: 0 };
    }
  },

  async groupGetStats({ groupId }) {
    try {
      ensureConnected();
      return await relayGet("/groups/" + groupId + "/stats");
    } catch (e) {
      return { memberCount: 0, messageCount: 0 };
    }
  },

  // ── Stories ──────────────────────────────────────────────────────────

  async storyPost({ mediaUrl, mediaType, caption, type, duration, thumbnailUrl }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] storyPost");
    try {
      ensureConnected();
      const result = await relayPost("/stories/post", {
        authorId: profile.userId, mediaUrl, mediaType, caption, type, duration, thumbnailUrl,
        signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, storyId: result.storyId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGet({ storyId }) {
    try {
      ensureConnected();
      return await relayGet("/stories/" + storyId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGetUser({ authorId }) {
    try {
      ensureConnected();
      return await relayGet("/stories/user/" + authorId);
    } catch (e) {
      return { stories: [], count: 0 };
    }
  },

  async storyGetFeed({ maxPerUser = 5 }) {
    try {
      ensureConnected();
      return await relayGet("/stories/feed", { maxPerUser });
    } catch (e) {
      return { feed: [], count: 0 };
    }
  },

  async storyView({ storyId }) {
    const profile = loadProfile();
    if (!profile) return { success: false };
    try {
      ensureConnected();
      await relayPost("/stories/" + storyId + "/view", { userId: profile.userId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyDelete({ storyId }) {
    try {
      ensureConnected();
      await relayPost("/stories/" + storyId + "/delete", { signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGetViewers({ storyId }) {
    try {
      ensureConnected();
      return await relayGet("/stories/" + storyId + "/viewers");
    } catch (e) {
      return { viewers: [], count: 0 };
    }
  },

  async storyReply({ storyId, content }) {
    const profile = loadProfile();
    if (!profile) return { success: false };
    try {
      ensureConnected();
      const result = await relayPost("/stories/" + storyId + "/reply", {
        userId: profile.userId, content, signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, replyId: result.replyId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGetReplies({ storyId, offset = 0, limit = 50 }) {
    try {
      ensureConnected();
      return await relayGet("/stories/" + storyId + "/replies", { offset, limit });
    } catch (e) {
      return { replies: [], count: 0 };
    }
  },

  async storyDeleteReply({ storyId, replyId }) {
    try {
      ensureConnected();
      await relayPost("/stories/" + storyId + "/replies/" + replyId + "/delete", { signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyCreateHighlight({ title, storyIds, coverUrl }) {
    const profile = loadProfile();
    if (!profile) return { success: false };
    try {
      ensureConnected();
      const result = await relayPost("/stories/highlights/create", {
        title, storyIds, coverUrl, authorId: profile.userId,
        signature: getSignature(), timestamp: Date.now(),
      });
      return { success: true, highlightId: result.highlightId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGetHighlight({ highlightId }) {
    try {
      ensureConnected();
      return await relayGet("/stories/highlights/" + highlightId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGetHighlights({ authorId }) {
    try {
      ensureConnected();
      return await relayGet("/stories/highlights/user/" + authorId);
    } catch (e) {
      return { highlights: [], count: 0 };
    }
  },

  async storyDeleteHighlight({ highlightId }) {
    try {
      ensureConnected();
      await relayPost("/stories/highlights/" + highlightId + "/delete", { signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async storyGetStats() {
    try {
      ensureConnected();
      return await relayGet("/stories/stats");
    } catch (e) {
      return { totalStories: 0, activeStories: 0, totalHighlights: 0 };
    }
  },

  // ── WebRTC Calls ─────────────────────────────────────────────────────

  async callInitiate({ calleeId, callerId, callType, offerSdp }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    console.log("[WebBridge] callInitiate to:", calleeId);
    try {
      ensureConnected();
      const result = await relayPost("/call/initiate", {
        callerId: callerId || profile.userId,
        calleeId,
        callType: callType || "audio",
        offer: offerSdp,
        signature: getSignature(),
        timestamp: Date.now(),
      });
      return { success: true, sessionId: result.sessionId, status: "ringing" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async callAnswer({ sessionId, answerSdp }) {
    const profile = loadProfile();
    if (!profile) return { success: false };
    try {
      ensureConnected();
      await relayPost("/call/answer", {
        sessionId,
        calleeId: profile.userId,
        answer: answerSdp,
        signature: getSignature(),
      });
      return { success: true, sessionId, status: "connected" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async callReject({ sessionId }) {
    try {
      ensureConnected();
      await relayPost("/call/reject", { sessionId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async callEnd({ sessionId }) {
    try {
      ensureConnected();
      await relayPost("/call/end", { sessionId, signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async callGetSession({ sessionId }) {
    try {
      ensureConnected();
      const result = await relayGet("/call/" + sessionId);
      return { session: result };
    } catch (e) {
      return { session: null };
    }
  },

  async callAddIceCandidate({ sessionId, candidate, sdpMid, sdpMLineIndex }) {
    try {
      ensureConnected();
      await relayPost("/call/ice/add", {
        sessionId, candidate, sdpMid, sdpMLineIndex,
        signature: getSignature(),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async callGetIceCandidates({ sessionId, sinceTimestamp }) {
    try {
      ensureConnected();
      return await relayGet("/call/ice/" + sessionId, { since: sinceTimestamp });
    } catch (e) {
      return { candidates: [], count: 0 };
    }
  },

  async callGetIncoming() {
    const profile = loadProfile();
    if (!profile) return { calls: [], count: 0 };
    try {
      ensureConnected();
      return await relayGet("/call/incoming/" + profile.userId);
    } catch (e) {
      return { calls: [], count: 0 };
    }
  },

  async callGetActive() {
    const profile = loadProfile();
    if (!profile) return { calls: [], count: 0 };
    try {
      ensureConnected();
      return await relayGet("/call/active/" + profile.userId);
    } catch (e) {
      return { calls: [], count: 0 };
    }
  },

  async callGetHistory({ limit = 20 }) {
    const profile = loadProfile();
    if (!profile) return { history: [], count: 0 };
    try {
      ensureConnected();
      return await relayGet("/call/history/" + profile.userId, { limit });
    } catch (e) {
      return { history: [], count: 0 };
    }
  },

  async callTimeout({ sessionId }) {
    try {
      ensureConnected();
      await relayPost("/call/timeout/" + sessionId, { signature: getSignature() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

<<<<<<< Updated upstream
  async callGetStats() {
    const profile = loadProfile();
    if (!profile) return { totalCalls: 0, totalDuration: 0 };
    try {
      ensureConnected();
      return await relayGet("/call/history/" + profile.userId);
    } catch (e) {
      return { totalCalls: 0, totalDuration: 0 };
    }
=======
  // ── P2P Block Sync (Scenarios A, B, C) ────────────────────────────

  // Seeding: announce this device is seeding a media file
  async seedAnnounce({ mediaHash, deviceId, listingId, manifest, ttlMinutes }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    try {
      return await relayPost("/relay/seed/announce", {
        media_hash: mediaHash,
        user_id: profile.userId,
        device_id: deviceId,
        listing_id: listingId || null,
        manifest: manifest || null,
        ttl_minutes: ttlMinutes || 60,
      });
    } catch (e) {
      console.warn("[WebBridge] seedAnnounce failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Seeding: get list of media this user is currently seeding
  async seedGetStatus() {
    const profile = loadProfile();
    if (!profile) return { seeders: [], seeding_count: 0 };
    try {
      return await relayGet("/relay/seed", { user_id: profile.userId });
    } catch (e) {
      console.warn("[WebBridge] seedGetStatus failed:", e.message);
      return { seeders: [], seeding_count: 0 };
    }
  },

  // Seeding: find seeders for a specific media hash
  async seedLookup({ mediaHash }) {
    try {
      return await relayGet(`/relay/seed/lookup/${mediaHash}`);
    } catch (e) {
      console.warn("[WebBridge] seedLookup failed:", e.message);
      return { seeders: [], seeder_count: 0 };
    }
  },

  // Seeding: stop seeding a media hash
  async seedRemove({ mediaHash, deviceId }) {
    try {
      return await relayPost(`/relay/seed/remove/${mediaHash}`, { device_id: deviceId });
    } catch (e) {
      console.warn("[WebBridge] seedRemove failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Block buffer: buffer an encrypted block for relay
  async blockBuffer({ fileHash, blockIndex, data }) {
    try {
      return await relayPost("/relay/block/buffer", {
        file_hash: fileHash,
        block_index: blockIndex,
        data,
      });
    } catch (e) {
      console.warn("[WebBridge] blockBuffer failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Block buffer: retrieve a buffered block
  async blockGet({ fileHash, blockIndex }) {
    try {
      return await relayGet(`/relay/block/get/${fileHash}/${blockIndex}`);
    } catch (e) {
      console.warn("[WebBridge] blockGet failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Block buffer: acknowledge block received
  async blockAck({ fileHash, blockIndex }) {
    try {
      return await relayPost(`/relay/block/ack/${fileHash}/${blockIndex}`);
    } catch (e) {
      console.warn("[WebBridge] blockAck failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // ── File Transfer (Scenario B — Direct File Send) ──────────────────

  // Transfer: initiate a file transfer to another user
  async transferCreate({ fileHash, fileName, fileSize, mimeType, recipientId, manifest }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    try {
      return await relayPost("/relay/transfer/create", {
        file_hash: fileHash,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        sender_id: profile.userId,
        recipient_id: recipientId,
        manifest: manifest || null,
      });
    } catch (e) {
      console.warn("[WebBridge] transferCreate failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Transfer: list transfer sessions
  async transferList({ status }) {
    const profile = loadProfile();
    if (!profile) return { pending: [], active: [] };
    try {
      return await relayGet("/relay/transfer", { user_id: profile.userId, status });
    } catch (e) {
      console.warn("[WebBridge] transferList failed:", e.message);
      return { pending: [], active: [] };
    }
  },

  // Transfer: accept a pending transfer
  async transferAccept({ sessionId }) {
    try {
      return await relayPost(`/relay/transfer/${sessionId}/accept`);
    } catch (e) {
      console.warn("[WebBridge] transferAccept failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Transfer: decline a pending transfer
  async transferDecline({ sessionId }) {
    try {
      return await relayPost(`/relay/transfer/${sessionId}/decline`);
    } catch (e) {
      console.warn("[WebBridge] transferDecline failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Transfer: cancel a transfer
  async transferCancel({ sessionId }) {
    try {
      const profile = loadProfile();
      return await relayPost(`/relay/transfer/${sessionId}/cancel`, { cancelled_by: profile?.userId });
    } catch (e) {
      console.warn("[WebBridge] transferCancel failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Transfer: get transfer progress
  async transferProgress({ sessionId }) {
    try {
      return await relayGet(`/relay/transfer/${sessionId}/progress`);
    } catch (e) {
      console.warn("[WebBridge] transferProgress failed:", e.message);
      return { progress: 0, status: "unknown" };
    }
  },

  // Transfer: record a block received
  async transferBlockReceived({ sessionId, blockIndex }) {
    try {
      return await relayPost(`/relay/transfer/${sessionId}/block/${blockIndex}`);
    } catch (e) {
      console.warn("[WebBridge] transferBlockReceived failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // ── Device Pairing (Scenario D) ────────────────────────────────────

  // Pairing: generate a pairing token
  async pairGenerate({ label }) {
    const profile = loadProfile();
    if (!profile) return { success: false, error: "No profile" };
    const deviceId = "web_" + (profile.userId || Date.now());
    try {
      return await relayPost("/relay/pair/generate", {
        user_id: profile.userId,
        device_id: deviceId,
        label: label || "Web Browser",
      });
    } catch (e) {
      console.warn("[WebBridge] pairGenerate failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Pairing: verify a token and pair this device
  async pairVerify({ token, deviceName, deviceType, publicKey }) {
    const deviceId = "web_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    try {
      return await relayPost("/relay/pair/verify", {
        token,
        device_id: deviceId,
        device_name: deviceName || "Web Browser",
        device_type: deviceType || "web",
        public_key: publicKey || "",
      });
    } catch (e) {
      console.warn("[WebBridge] pairVerify failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Pairing: list paired devices
  async pairList() {
    const profile = loadProfile();
    if (!profile) return { devices: [] };
    try {
      return await relayGet("/relay/pair", { user_id: profile.userId });
    } catch (e) {
      console.warn("[WebBridge] pairList failed:", e.message);
      return { devices: [] };
    }
  },

  // Pairing: unpair a device
  async pairUnpair({ pairingId }) {
    const deviceId = "web_" + (loadProfile()?.userId || Date.now());
    try {
      return await relayPost(`/relay/pair/${pairingId}/unpair`, { requesting_device_id: deviceId });
    } catch (e) {
      console.warn("[WebBridge] pairUnpair failed:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Multi-device sync: get sync delta
  async deviceSyncDelta({ deviceId }) {
    try {
      return await relayGet(`/relay/devicesync/${deviceId}/delta`);
    } catch (e) {
      console.warn("[WebBridge] deviceSyncDelta failed:", e.message);
      return { new_dms: [], new_group_msgs: [] };
    }
  },

  // ── Event Listeners (EventTarget-based) ────────────────────────────

  addListener(event, callback) {
    _eventTarget.addEventListener(event, (e) => callback(e.detail));
    return { remove: () => _eventTarget.removeEventListener(event, (e) => callback(e.detail)) };
>>>>>>> Stashed changes
  },

  // ── Media Storage Options ────────────────────────────────────────────

  async getStoragePreference() {
    // Web bridge always uses server relay — no local P2P storage
    return { storageType: "relay", gdriveConnected: false, web3Connected: false, web3Email: null, web3DID: null };
  },

  async setStoragePreference({ storageType }) {
    console.log("[WebBridge] setStoragePreference:", storageType, "— web only supports relay");
    return { success: false, error: "Web bridge only supports relay storage" };
  },

  async connectGoogleDrive({ accessToken, refreshToken, serverAuthCode, expiresIn }) {
    console.log("[WebBridge] connectGoogleDrive — not available on web");
    return { success: false, error: "Google Drive storage requires native platform" };
  },

  async disconnectGoogleDrive() {
    return { success: true, disconnected: true };
  },

  async connectWeb3Storage({ delegationToken, did, email }) {
    console.log("[WebBridge] connectWeb3Storage — not available on web");
    return { success: false, error: "Web3 storage requires native platform" };
  },

  async disconnectWeb3Storage() {
    return { success: true, disconnected: true };
  },

  async getStorageStatus() {
    return { storageType: "relay", gdriveConnected: false, web3Connected: false, web3Email: null, web3DID: null, gdriveHasRefreshToken: false };
  },
};

// ── EventTarget access for the app to listen ───────────────────────────
// Usage:
//   import { P2PCore, webBridgeEvents } from "./p2p-web.js";
//   webBridgeEvents.addEventListener("new-messages", (e) => { ... });
//   webBridgeEvents.addEventListener("connection-changed", (e) => { ... });
export const webBridgeEvents = _eventTarget;
