// mock-stories.js — Stories mock methods
import { _profile, _stories, _storyReplies, _highlights } from "./mock-state.js";

export async function storyPost({ mediaUrl, mediaType, caption, type, duration, thumbnailUrl }) {
  if (!_profile) return { success: false, error: "No profile" };
  const storyId = "story_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
  const story = {
    storyId, authorId: _profile.userId, authorName: _profile.name, authorHandle: _profile.handle,
    mediaUrl, mediaType: mediaType || "image", caption: caption || "",
    type: type || "normal", duration: duration || 0, thumbnailUrl: thumbnailUrl || null,
    views: 0, replyCount: 0, viewers: [], createdAt: Date.now(), expiresAt: Date.now() + 86400000
  };
  _stories.push(story);
  console.log('[Mock] storyPost:', storyId);
  return { success: true, storyId };
}

export async function storyGet({ storyId }) {
  const story = _stories.find(s => s.storyId === storyId);
  if (!story) return { success: false, error: "Not found" };
  return { success: true, story };
}

export async function storyGetUser({ authorId }) {
  const now = Date.now();
  const stories = _stories.filter(s => s.authorId === authorId && s.expiresAt > now);
  return { stories, count: stories.length };
}

export async function storyGetFeed({ maxPerUser = 5 }) {
  const now = Date.now();
  const active = _stories.filter(s => s.expiresAt > now);
  const grouped = {};
  for (const s of active) {
    if (!grouped[s.authorId]) grouped[s.authorId] = { authorId: s.authorId, authorName: s.authorName, authorHandle: s.authorHandle, stories: [] };
    if (grouped[s.authorId].stories.length < maxPerUser) grouped[s.authorId].stories.push(s);
  }
  return { feed: Object.values(grouped), count: Object.keys(grouped).length };
}

export async function storyView({ storyId }) {
  const story = _stories.find(s => s.storyId === storyId);
  if (story) {
    story.views++;
    if (_profile && !story.viewers.includes(_profile.userId)) story.viewers.push(_profile.userId);
  }
  return { success: true };
}

export async function storyDelete({ storyId }) {
  const idx = _stories.findIndex(s => s.storyId === storyId);
  if (idx >= 0) _stories.splice(idx, 1);
  return { success: true };
}

export async function storyGetViewers({ storyId }) {
  const story = _stories.find(s => s.storyId === storyId);
  if (!story) return { viewers: [], count: 0 };
  return { viewers: story.viewers.map(id => ({ userId: id, viewedAt: Date.now() })), count: story.viewers.length };
}

export async function storyReply({ storyId, content }) {
  if (!_profile) return { success: false };
  const replyId = "sreply_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
  const reply = { replyId, storyId, userId: _profile.userId, userName: _profile.name, content, timestamp: Date.now() };
  if (!_storyReplies[storyId]) _storyReplies[storyId] = [];
  _storyReplies[storyId].push(reply);
  const story = _stories.find(s => s.storyId === storyId);
  if (story) story.replyCount = _storyReplies[storyId].length;
  return { success: true, replyId };
}

export async function storyGetReplies({ storyId, offset = 0, limit = 50 }) {
  const replies = _storyReplies[storyId] || [];
  return { replies: replies.slice(offset, offset + limit), count: replies.length };
}

export async function storyDeleteReply({ storyId, replyId }) {
  if (!_storyReplies[storyId]) return { success: false };
  const idx = _storyReplies[storyId].findIndex(r => r.replyId === replyId);
  if (idx >= 0) _storyReplies[storyId].splice(idx, 1);
  return { success: true };
}

export async function storyCreateHighlight({ title, storyIds, coverUrl }) {
  if (!_profile) return { success: false };
  const highlightId = "hl_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
  _highlights[highlightId] = {
    highlightId, title, storyIds: storyIds || [], coverUrl: coverUrl || null,
    authorId: _profile.userId, createdAt: Date.now()
  };
  return { success: true, highlightId };
}

export async function storyGetHighlight({ highlightId }) {
  const hl = _highlights[highlightId];
  if (!hl) return { success: false, error: "Not found" };
  return { success: true, highlight: hl };
}

export async function storyGetHighlights({ authorId }) {
  const hls = Object.values(_highlights).filter(h => h.authorId === authorId);
  return { highlights: hls, count: hls.length };
}

export async function storyDeleteHighlight({ highlightId }) {
  delete _highlights[highlightId];
  return { success: true };
}

export async function storyGetStats() {
  const now = Date.now();
  return { totalStories: _stories.length, activeStories: _stories.filter(s => s.expiresAt > now).length, totalHighlights: Object.keys(_highlights).length };
}
