// mock-group-chat.js — Group chat mock methods
import { _profile, _groups, _groupMessages, _groupInvites } from "./mock-state.js";

export async function groupCreate({ name, description, maxMembers, avatarUrl, creatorId }) {
  if (!_profile) return { success: false, error: "No profile" };
  const groupId = "grp_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
  const group = {
    groupId, name, description: description || "", maxMembers: maxMembers || 1000,
    avatarUrl: avatarUrl || null, createdBy: _profile.userId, createdAt: Date.now(),
    members: [{ userId: _profile.userId, name: _profile.name, handle: _profile.handle, role: "admin", joinedAt: Date.now() }],
    memberCount: 1, messageCount: 0, bannedUsers: []
  };
  _groups.set(groupId, group);
  _groupMessages.set(groupId, []);
  console.log('[Mock] groupCreate:', name, '→', groupId);
  return { success: true, groupId };
}

export async function groupGet({ groupId }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false, error: "Group not found" };
  return { success: true, group };
}

export async function groupUpdate({ groupId, name, description, avatarUrl }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false, error: "Group not found" };
  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  if (avatarUrl !== undefined) group.avatarUrl = avatarUrl;
  return { success: true };
}

export async function groupDelete({ groupId }) {
  _groups.delete(groupId);
  _groupMessages.delete(groupId);
  return { success: true };
}

export async function groupJoin({ groupId }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false, error: "Group not found" };
  if (!_profile) return { success: false, error: "No profile" };
  if (group.members.find(m => m.userId === _profile.userId)) return { success: true };
  group.members.push({ userId: _profile.userId, name: _profile.name, handle: _profile.handle, role: "member", joinedAt: Date.now() });
  group.memberCount = group.members.length;
  return { success: true };
}

export async function groupLeave({ groupId }) {
  const group = _groups.get(groupId);
  if (!group || !_profile) return { success: false };
  group.members = group.members.filter(m => m.userId !== _profile.userId);
  group.memberCount = group.members.length;
  return { success: true };
}

export async function groupKick({ groupId, userId }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false };
  group.members = group.members.filter(m => m.userId !== userId);
  group.memberCount = group.members.length;
  return { success: true };
}

export async function groupBan({ groupId, userId }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false };
  if (!group.bannedUsers) group.bannedUsers = [];
  group.bannedUsers.push(userId);
  group.members = group.members.filter(m => m.userId !== userId);
  return { success: true };
}

export async function groupUnban({ groupId, userId }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false };
  group.bannedUsers = (group.bannedUsers || []).filter(u => u !== userId);
  return { success: true };
}

export async function groupSetRole({ groupId, userId, role }) {
  const group = _groups.get(groupId);
  if (!group) return { success: false };
  const member = group.members.find(m => m.userId === userId);
  if (member) member.role = role;
  return { success: true };
}

export async function groupGetMembers({ groupId }) {
  const group = _groups.get(groupId);
  if (!group) return { members: [], count: 0 };
  return { members: group.members, count: group.members.length };
}

export async function groupSendMessage({ groupId, encryptedContent, messageType, mediaUrl }) {
  if (!_profile) return { success: false };
  const msgs = _groupMessages.get(groupId);
  if (!msgs) return { success: false, error: "Group not found" };
  const messageId = "gmsg_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
  const msg = {
    messageId, groupId, senderId: _profile.userId, senderName: _profile.name,
    encryptedContent, messageType: messageType || "text", mediaUrl: mediaUrl || null,
    timestamp: Date.now(), deliveryStatus: "sent"
  };
  msgs.push(msg);
  const group = _groups.get(groupId);
  if (group) group.messageCount = msgs.length;
  return { success: true, messageId };
}

export async function groupGetMessages({ groupId, offset = 0, limit = 50 }) {
  const msgs = _groupMessages.get(groupId) || [];
  return { messages: msgs.slice(offset, offset + limit), count: msgs.length, hasMore: msgs.length > offset + limit };
}

export async function groupDeleteMessage({ groupId, messageId }) {
  const msgs = _groupMessages.get(groupId);
  if (!msgs) return { success: false };
  const idx = msgs.findIndex(m => m.messageId === messageId);
  if (idx >= 0) msgs.splice(idx, 1);
  return { success: true };
}

export async function groupCreateInvite({ groupId, expiresInHours = 24, maxUses = 100 }) {
  const inviteCode = "inv_" + Math.random().toString(36).slice(2, 10);
  _groupInvites[inviteCode] = {
    groupId, inviteCode, createdBy: _profile?.userId,
    expiresAt: Date.now() + expiresInHours * 3600000, maxUses, uses: 0
  };
  return { success: true, inviteCode };
}

export async function groupJoinByInvite({ inviteCode }) {
  const invite = _groupInvites[inviteCode];
  if (!invite) return { success: false, error: "Invalid invite" };
  if (invite.expiresAt < Date.now()) return { success: false, error: "Invite expired" };
  if (invite.uses >= invite.maxUses) return { success: false, error: "Invite max uses reached" };
  invite.uses++;
  const group = _groups.get(invite.groupId);
  if (!group) return { success: false, error: "Group not found" };
  if (_profile && !group.members.find(m => m.userId === _profile.userId)) {
    group.members.push({ userId: _profile.userId, name: _profile.name, handle: _profile.handle, role: "member", joinedAt: Date.now() });
    group.memberCount = group.members.length;
  }
  return { success: true, groupId: invite.groupId };
}

export async function groupGetInvite({ inviteCode }) {
  const invite = _groupInvites[inviteCode];
  if (!invite) return { success: false, error: "Not found" };
  const group = _groups.get(invite.groupId);
  return { success: true, invite: { ...invite, groupName: group?.name || "" } };
}

export async function groupGetMy() {
  if (!_profile) return { groups: [], count: 0 };
  const myGroups = Array.from(_groups.values()).filter(g => g.members.some(m => m.userId === _profile.userId));
  return { groups: myGroups, count: myGroups.length };
}

export async function groupSearch({ query }) {
  const results = Array.from(_groups.values()).filter(g =>
    g.name.toLowerCase().includes(query?.toLowerCase() || "")
  );
  return { groups: results, count: results.length };
}

export async function groupGetStats({ groupId }) {
  const group = _groups.get(groupId);
  if (!group) return { memberCount: 0, messageCount: 0 };
  return { memberCount: group.members.length, messageCount: (_groupMessages.get(groupId) || []).length };
}
