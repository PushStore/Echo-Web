// mock-messaging.js — Direct messaging mock methods
import { _profile, _users, _conversations } from "./mock-state.js";

function getConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join('_conv_');
}

export async function sendMessage({ recipientId, text, image, video, audio, duration }) {
  if (!_profile) return { success: false, error: "No profile" };
  const conversationId = getConversationId(_profile.userId, recipientId);
  const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  if (!_conversations[conversationId]) {
    _conversations[conversationId] = { otherUserId: recipientId, messages: [] };
  }
  const message = {
    id: messageId, conversationId, senderId: _profile.userId, recipientId,
    content: text || "",
    messageType: audio ? "audio" : (video ? "video" : (image ? "image" : "text")),
    imageData: image || null, videoData: video || null, videoThumbnail: null,
    audioData: audio || null, duration: duration || 0, timestamp: Date.now(),
    deliveryStatus: "sent", isOutgoing: true, encrypted: true
  };
  _conversations[conversationId].messages.push(message);
  return { success: true, messageId, conversationId, deliveryStatus: "sent" };
}

export async function getConversations() {
  const convs = Object.entries(_conversations).map(([convId, data]) => {
    const lastMsg = data.messages[data.messages.length - 1];
    const user = _users.find(u => u.userId === data.otherUserId);
    const displayName = user ? user.displayName : (data.otherUserId.slice(0, 16) + '...');
    return {
      conversationId: convId, otherUserId: data.otherUserId,
      otherUserName: displayName, otherUserHandle: user?.handle || "",
      otherUserAvatar: null,
      latestMessageId: lastMsg?.id || null,
      latestMessagePreview: lastMsg?.messageType === "image" ? "📷 Photo" :
                            lastMsg?.messageType === "video" ? "🎥 Video" :
                            lastMsg?.messageType === "audio" ? "🎤 Voice" : lastMsg?.content || "",
      messageType: lastMsg?.messageType || "text",
      latestTimestamp: lastMsg?.timestamp || 0, unreadCount: 0
    };
  });
  convs.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  return { conversations: convs, count: convs.length };
}

export async function getMessages({ conversationId, limit = 50 }) {
  const conv = _conversations[conversationId];
  if (!conv) return { messages: [], count: 0 };
  const messages = conv.messages.slice(-limit).map(msg => ({
    ...msg, encrypted: true, encryptionInfo: "Kyber-768 + AES-256-GCM"
  }));
  return { messages, count: messages.length };
}

export async function deleteMessage({ messageId }) {
  for (const convId in _conversations) {
    const conv = _conversations[convId];
    const idx = conv.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      conv.messages.splice(idx, 1);
      if (conv.messages.length === 0) delete _conversations[convId];
      return { success: true };
    }
  }
  return { success: false, error: "Message not found" };
}

export async function deleteConversation({ conversationId }) {
  if (_conversations[conversationId]) {
    delete _conversations[conversationId];
    return { success: true };
  }
  return { success: false, error: "Conversation not found" };
}

export async function getTotalUnreadCount() {
  return { unreadCount: 0 };
}
