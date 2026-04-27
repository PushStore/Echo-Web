// mock-social.js — Social (follow/unfollow/search/profile stats) mock methods
import { _profile, _users, _following, _followers } from "./mock-state.js";

export async function followUser({ userId }) {
  if (!_profile) return { success: false, error: "No profile" };
  const followerId = _profile.userId;
  if (!_following[followerId]) _following[followerId] = new Set();
  if (!_followers[userId]) _followers[userId] = new Set();
  _following[followerId].add(userId);
  _followers[userId].add(followerId);
  return { success: true };
}

export async function unfollowUser({ userId }) {
  if (!_profile) return { success: false, error: "No profile" };
  const followerId = _profile.userId;
  if (_following[followerId]) _following[followerId].delete(userId);
  if (_followers[userId]) _followers[userId].delete(followerId);
  return { success: true };
}

export async function getFollowing({ userId } = {}) {
  const targetId = userId || (_profile ? _profile.userId : null);
  if (!targetId) return { users: [] };
  const followingIds = _following[targetId] ? Array.from(_following[targetId]) : [];
  const users = followingIds.map(id => {
    if (id === _profile?.userId) return { userId: _profile.userId, name: _profile.name, handle: _profile.handle, avatar: _profile.avatar, online: true };
    const mockUser = _users.find(u => u.userId === id);
    return mockUser ? { userId: mockUser.userId, name: mockUser.displayName, handle: mockUser.handle, avatar: mockUser.avatar, online: true } : { userId: id, online: true };
  });
  return { users };
}

export async function getFollowers({ userId }) {
  const targetId = userId || (_profile ? _profile.userId : null);
  if (!targetId) return { users: [] };
  const followerIds = _followers[targetId] ? Array.from(_followers[targetId]) : [];
  const users = followerIds.map(id => {
    if (id === _profile?.userId) return { userId: _profile.userId, name: _profile.name, handle: _profile.handle, avatar: _profile.avatar, online: true };
    const mockUser = _users.find(u => u.userId === id);
    return mockUser ? { userId: mockUser.userId, name: mockUser.displayName, handle: mockUser.handle, avatar: mockUser.avatar, online: true } : { userId: id, online: true };
  });
  return { users };
}

export async function getProfileStats({ userId }) {
  const followerCount = _followers[userId] ? _followers[userId].size : 0;
  const followingCount = _following[userId] ? _following[userId].size : 0;
  return { followers: followerCount, following: followingCount };
}

export async function searchUsers({ query, limit = 20 }) {
  const myFollowing = _profile ? (_following[_profile.userId] || new Set()) : new Set();
  const results = _users.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.handle.toLowerCase().includes(query.toLowerCase()) ||
    u.userId.toLowerCase().includes(query.toLowerCase())
  ).slice(0, limit).map(u => ({
    userId: u.userId, name: u.displayName, handle: u.handle,
    avatar: u.avatar, online: true, endpoint: null,
    isFollowing: myFollowing.has(u.userId)
  }));
  return { users: results };
}
