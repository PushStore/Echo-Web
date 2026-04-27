// mock-identity.js — Identity & profile mock methods
import { _profile, _users, setProfile, clearProfile } from "./mock-state.js";

export async function getMyProfile() {
  if (!_profile) return { exists: false };
  return { exists:true, userId:_profile.userId, name:_profile.name, handle:_profile.handle, avatar:_profile.avatar, bio:_profile.bio };
}

export async function checkHandleAvailable({ handle }) {
  console.log('[Mock] checkHandleAvailable:', handle);
  return { available: true, handle };
}

export async function setupProfile({ name, handle, bio="", avatar=null, banner=null }) {
  const userId = _profile ? _profile.userId : ("mock_pubkey_" + Math.random().toString(36).slice(2,10));
  setProfile({
    userId, name, handle, bio,
    avatar: avatar !== undefined ? avatar : (_profile?.avatar || null),
    banner: banner !== undefined ? banner : (_profile?.banner || null)
  });
  console.log('[Mock] setupProfile:', name, handle, '→', userId);
  return { success: true, userId };
}

export async function updateProfile({ name, bio, avatar, banner }) {
  if (!_profile) return { success: false };
  if (name)             _profile.name   = name.trim();
  if (bio !== undefined) _profile.bio   = bio;
  if (avatar)           _profile.avatar = avatar;
  if (banner)           _profile.banner = banner;
  if (avatar) {
    const { _posts } = await import("./mock-state.js");
    _posts.forEach((p, i, arr) => {
      if (p.authorId === _profile.userId) arr[i] = { ...p, authorAvatar: avatar };
    });
  }
  return { success: true, name: _profile.name, bio: _profile.bio, avatar: _profile.avatar, banner: _profile.banner };
}

export async function deleteAccount() {
  const { _posts, _viewCounts } = await import("./mock-state.js");
  clearProfile();
  _posts.length = 0;
  Object.keys(_viewCounts).forEach(k => delete _viewCounts[k]);
  return { success: true };
}

export async function getBookmarks() {
  const { _posts } = await import("./mock-state.js");
  return { posts: _posts.filter(p => p.bookmarked) };
}
