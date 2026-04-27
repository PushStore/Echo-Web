import { useState, useEffect, useRef } from "react";
import { clearVideoCache } from "../services/videoBlobCache.js";

// ── Feed cache: persist posts to localStorage, sync avatar/name ──────────────
// Returns { posts, setPosts }
//
// On mount, loads cached posts from localStorage.
// When posts change, persists up to 100 posts to localStorage.
// When `me` changes (e.g. profile update), patches all own posts with current
// avatar and name to keep the feed in sync.
export function useFeedCache(me) {
  const CACHE_KEY = "echo_feed_cache";

  const saveCache = (posts) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(posts.slice(0, 100))); } catch(_) {}
  };
  const loadCache = () => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); } catch(_) { return []; }
  };

  const [posts, setPosts] = useState(() => loadCache());

  // Persist on change
  useEffect(() => {
    if (posts.length > 0) saveCache(posts);
  }, [posts]);

  // Sync own posts with latest avatar/name
  const syncAvatarRef = useRef(null);
  if (me && posts.length > 0) {
    const needsSync = posts.some(
      p => p.authorId === me.userId && (p.authorAvatar !== me.avatar || p.authorName !== me.name)
    );
    if (needsSync && !syncAvatarRef.current) {
      syncAvatarRef.current = true;
      queueMicrotask(() => {
        setPosts(prev => prev.map(p =>
          p.authorId === me.userId
            ? { ...p, authorAvatar: me.avatar, authorName: me.name }
            : p
        ));
        syncAvatarRef.current = false;
      });
    }
  }

  // Clear cache helper for logout
  const clearCache = () => {
    try { localStorage.removeItem(CACHE_KEY); } catch(_) {}
  };

  return { posts, setPosts, clearFeedCache: clearCache, clearVideoCache };
}
