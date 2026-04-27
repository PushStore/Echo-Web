// mock-feed.js — Feed & engagement mock methods
import { _profile, _posts, _viewCounts } from "./mock-state.js";

export async function getFeed({ cursor = 0, limit = 20 } = {}) {
  const now = Date.now();
  const updatedPosts = _posts
    .filter(p => !p.expiresAt || p.expiresAt > now)
    .map(p => ({
      ...p,
      views: _viewCounts[p.id] || Math.floor(Math.random() * 1000) + 1,
      ...(p.authorId === _profile?.userId ? { authorAvatar: _profile.avatar, authorName: _profile.name } : {}),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
  return { posts: updatedPosts, count: updatedPosts.length, nextCursor: 0, hasMore: false };
}

export async function getForYouFeed({ limit = 20 } = {}) {
  const now = Date.now();
  const candidatePosts = _posts.filter(p => {
    if (p.expiresAt && p.expiresAt <= now) return false;
    return (p.likes||0) >= 5 || (p.replies||0) >= 5 || (p.retweets||0) >= 2 || (p.bookmarked ? 1 : 0) >= 1;
  });
  const scored = candidatePosts.map(p => {
    const ageHours = (now - (p.timestamp || 0)) / 3600000;
    const decay = Math.pow(0.5, ageHours / 12);
    const score = ((p.likes||0)*3 + (p.replies||0)*2 + (p.retweets||0)*4 + (p.bookmarked?5:0)) * decay;
    return { ...p, _trendingScore: score };
  }).sort((a, b) => b._trendingScore - a._trendingScore);
  return { posts: scored.slice(0, limit), count: scored.length, hasMore: false };
}

export async function getTrendingFollowingFeed({ limit = 20 } = {}) {
  if (!_profile) return { posts: [], count: 0 };
  const { _following } = await import("./mock-state.js");
  const followingIds = _following[_profile.userId] ? Array.from(_following[_profile.userId]) : [];
  const now = Date.now();
  const candidatePosts = _posts.filter(p => {
    if (p.expiresAt && p.expiresAt <= now) return false;
    if (!followingIds.includes(p.authorId) && p.authorId !== _profile.userId) return false;
    return (p.likes||0) >= 5 || (p.replies||0) >= 5 || (p.retweets||0) >= 2 || (p.bookmarked ? 1 : 0) >= 1;
  });
  const scored = candidatePosts.map(p => {
    const ageHours = (now - (p.timestamp || 0)) / 3600000;
    const decay = Math.pow(0.5, ageHours / 12);
    const score = ((p.likes||0)*3 + (p.replies||0)*2 + (p.retweets||0)*4 + (p.bookmarked?5:0)) * decay;
    return { ...p, _trendingScore: score };
  }).sort((a, b) => b._trendingScore - a._trendingScore);
  return { posts: scored.slice(0, limit), count: scored.length, hasMore: false };
}

export async function getFollowingFeed({ cursor = 0, limit = 50 } = {}) {
  if (!_profile) return { posts: [], count: 0 };
  const { _following } = await import("./mock-state.js");
  const followingIds = _following[_profile.userId] ? Array.from(_following[_profile.userId]) : [];
  if (followingIds.length === 0) return { posts: [], count: 0 };
  const now = Date.now();
  const feedPosts = _posts
    .filter(p => followingIds.includes(p.authorId) && (!p.expiresAt || p.expiresAt > now))
    .map(p => ({ ...p, views: _viewCounts[p.id] || Math.floor(Math.random() * 1000) + 1 }))
    .sort((a, b) => b.timestamp - a.timestamp);
  return { posts: feedPosts, count: feedPosts.length, nextCursor: 0, hasMore: false };
}

export async function createPost({ text, image, video }) {
  if (!_profile) return { success: false };
  const post = {
    id: "post_" + Date.now(), authorId: _profile.userId, authorName: _profile.name,
    authorHandle: _profile.handle, authorAvatar: _profile.avatar,
    text: text || null, image: image || null, video: video || null, timestamp: Date.now(),
    likes: 0, retweets: 0, replies: 0, views: 0,
    liked: false, disliked: false, retweeted: false, bookmarked: false, isMine: true, postType: "post"
  };
  _posts.unshift(post);
  _viewCounts[post.id] = 0;
  console.log('[Mock] createPost:', text, image ? '[image]' : '', video ? '[video]' : '');
  return { success: true, postId: post.id };
}

export async function deletePost({ postId }) {
  const idx = _posts.findIndex(p => p.id === postId);
  if (idx >= 0) _posts.splice(idx, 1);
  delete _viewCounts[postId];
  return { success: true };
}

export async function likePost({ postId }) {
  const post = _posts.find(p => p.id === postId);
  if (post && !post.liked) { post.liked = true; post.likes = (post.likes||0) + 1; }
  return { success: true };
}

export async function unlikePost({ postId }) {
  const post = _posts.find(p => p.id === postId);
  if (post && post.liked) { post.liked = false; post.likes = Math.max(0, (post.likes||0) - 1); }
  return { success: true };
}

export async function dislikePost({ postId }) {
  const post = _posts.find(p => p.id === postId);
  if (post && !post.disliked) {
    if (post.liked) { post.liked = false; post.likes = Math.max(0, (post.likes||0) - 1); }
    post.disliked = true;
    post.dislikes = (post.dislikes||0) + 1;
  }
  return { success: true };
}

export async function undislikePost({ postId }) {
  const post = _posts.find(p => p.id === postId);
  if (post && post.disliked) { post.disliked = false; post.dislikes = Math.max(0, (post.dislikes||0) - 1); }
  return { success: true };
}

export async function retweetPost({ postId }) {
  const original = _posts.find(p => p.id === postId);
  if (original && !original.retweeted) {
    original.retweeted = true;
    original.retweets = (original.retweets||0) + 1;
    const retweetPost = {
      id: "rt_" + Date.now(), authorId: _profile.userId, authorName: _profile.name,
      authorHandle: _profile.handle, authorAvatar: _profile.avatar,
      text: null, image: null, video: null, timestamp: Date.now(),
      likes: 0, retweets: 0, replies: 0, views: 0,
      liked: false, retweeted: false, bookmarked: false, isMine: true,
      postType: "retweet", originalPostId: postId, originalPost: original
    };
    _posts.unshift(retweetPost);
    _viewCounts[retweetPost.id] = 0;
  }
  return { success: true };
}

export async function bookmarkPost({ postId }) {
  const post = _posts.find(p => p.id === postId);
  if (post) post.bookmarked = !post.bookmarked;
  return { success: true };
}

export async function replyToPost({ postId, text }) {
  const original = _posts.find(p => p.id === postId);
  if (original && text) {
    original.replies = (original.replies||0) + 1;
    const replyPost = {
      id: "reply_" + Date.now(), authorId: _profile.userId, authorName: _profile.name,
      authorHandle: _profile.handle, authorAvatar: _profile.avatar,
      text, image: null, video: null, timestamp: Date.now(),
      likes: 0, retweets: 0, replies: 0, views: 0,
      liked: false, retweeted: false, bookmarked: false, isMine: true,
      postType: "reply", originalPostId: postId, originalPost: original
    };
    _posts.unshift(replyPost);
    _viewCounts[replyPost.id] = 0;
    return { success: true, postId: replyPost.id };
  }
  return { success: false };
}
