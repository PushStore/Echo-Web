// p2p-mock.js — Browser mock for P2P Core plugin.
// Used automatically when running in browser (npm start / web preview).
// Simulates the Android P2P layer without a real device.
//
// The mock is split into focused domain modules under src/mocks/:
//   mock-state.js              — shared mutable state
//   mock-identity.js           — profile setup/update/delete, bookmarks
//   mock-feed.js               — feed queries, create/delete/like/retweet/reply posts
//   mock-social.js             — follow/unfollow, search, profile stats
//   mock-messaging.js          — DMs, conversations
//   mock-node-relay.js         — Echo Node connect/disconnect, network status
//   mock-mothership.js         — Mother Ship connect/disconnect, DM relay
//   mock-identity-verification.js — key challenge/verify/rotate, trust
//   mock-backup.js             — backup create/restore/verify, DHT store
//   mock-device-sync.js        — multi-device register/heartbeat/revoke/sync
//   mock-marketplace.js        — content marketplace CRUD, collections, stats
//   mock-group-chat.js         — group CRUD, members, messages, invites
//   mock-stories.js            — stories, highlights, replies, viewers
//   mock-calls.js              — WebRTC call initiate/answer/end/history

// Import shared state (triggers seed IIFE)
import "./mocks/mock-state.js";

// Import domain modules
import * as identity            from "./mocks/mock-identity.js";
import * as feed                from "./mocks/mock-feed.js";
import * as social              from "./mocks/mock-social.js";
import * as messaging           from "./mocks/mock-messaging.js";
import * as nodeRelay           from "./mocks/mock-node-relay.js";
import * as mothership          from "./mocks/mock-mothership.js";
import * as identityVerification from "./mocks/mock-identity-verification.js";
import * as backup              from "./mocks/mock-backup.js";
import * as deviceSync          from "./mocks/mock-device-sync.js";
import * as marketplace         from "./mocks/mock-marketplace.js";
import * as groupChat           from "./mocks/mock-group-chat.js";
import * as stories             from "./mocks/mock-stories.js";
import * as calls               from "./mocks/mock-calls.js";
import * as storage             from "./mocks/mock-storage.js";
import * as p2pBlockSync        from "./mocks/mock-device-sync.js";

/**
 * P2PCore mock — mirrors the native Android Capacitor plugin API.
 * Each method is an async function with the same signature as the real plugin.
 */
export const P2PCore = {
  // ── Identity ───────────────────────────────────────────────────────
  getMyProfile:          identity.getMyProfile,
  checkHandleAvailable:  identity.checkHandleAvailable,
  setupProfile:         identity.setupProfile,
  updateProfile:        identity.updateProfile,
  deleteAccount:        identity.deleteAccount,
  getBookmarks:         identity.getBookmarks,

  // ── Feed ───────────────────────────────────────────────────────────
  getFeed:                feed.getFeed,
  getForYouFeed:          feed.getForYouFeed,
  getTrendingFollowingFeed: feed.getTrendingFollowingFeed,
  getFollowingFeed:       feed.getFollowingFeed,
  createPost:             feed.createPost,
  deletePost:             feed.deletePost,
  likePost:               feed.likePost,
  unlikePost:             feed.unlikePost,
  dislikePost:            feed.dislikePost,
  undislikePost:          feed.undislikePost,
  retweetPost:            feed.retweetPost,
  bookmarkPost:           feed.bookmarkPost,
  replyToPost:            feed.replyToPost,

  // ── Social ─────────────────────────────────────────────────────────
  followUser:       social.followUser,
  unfollowUser:     social.unfollowUser,
  getFollowing:     social.getFollowing,
  getFollowers:     social.getFollowers,
  getProfileStats:  social.getProfileStats,
  searchUsers:      social.searchUsers,

  // ── Direct Messages ───────────────────────────────────────────────
  sendMessage:       messaging.sendMessage,
  getConversations:  messaging.getConversations,
  getMessages:       messaging.getMessages,
  deleteMessage:     messaging.deleteMessage,
  deleteConversation: messaging.deleteConversation,
  getTotalUnreadCount: messaging.getTotalUnreadCount,

  // ── Echo Node Relay ───────────────────────────────────────────────
  connectToEchoNode:    nodeRelay.connectToEchoNode,
  disconnectEchoNode:   nodeRelay.disconnectEchoNode,
  getEchoNodeStatus:    nodeRelay.getEchoNodeStatus,
  getNetworkStatus:     nodeRelay.getNetworkStatus,
  startService:         nodeRelay.startService,
  stopService:          nodeRelay.stopService,

  // ── Mother Ship Relay ─────────────────────────────────────────────
  connectToMothership:    mothership.connectToMothership,
  disconnectFromMothership: mothership.disconnectFromMothership,
  getMothershipStatus:     mothership.getMothershipStatus,
  sendDmViaMothership:     mothership.sendDmViaMothership,
  requestNearbyNode:       mothership.requestNearbyNode,

  // ── Identity Verification ─────────────────────────────────────────
  identityGetStatus:       identityVerification.identityGetStatus,
  identityChallenge:       identityVerification.identityChallenge,
  identityVerify:          identityVerification.identityVerify,
  identityRotateKey:       identityVerification.identityRotateKey,
  identityGetKeys:         identityVerification.identityGetKeys,
  identitySetTrust:        identityVerification.identitySetTrust,
  identityVerifyPrekey:    identityVerification.identityVerifyPrekey,

  // ── Backup & Restore ──────────────────────────────────────────────
  backupCreate:     backup.backupCreate,
  backupRestore:    backup.backupRestore,
  backupVerify:     backup.backupVerify,
  backupDhtStore:   backup.backupDhtStore,
  backupDhtRestore: backup.backupDhtRestore,
  backupGetStatus:  backup.backupGetStatus,

  // ── Multi-Device Sync ─────────────────────────────────────────────
  deviceRegister:    deviceSync.deviceRegister,
  deviceList:        deviceSync.deviceList,
  deviceHeartbeat:   deviceSync.deviceHeartbeat,
  deviceRevoke:      deviceSync.deviceRevoke,
  deviceGetStatus:   deviceSync.deviceGetStatus,
  syncGetDevices:    deviceSync.syncGetDevices,
  syncPullDevice:    deviceSync.syncPullDevice,
  syncPushDevice:    deviceSync.syncPushDevice,

  // ── Content Marketplace ───────────────────────────────────────────
  marketplacePublish:         marketplace.marketplacePublish,
  marketplaceGetContent:      marketplace.marketplaceGetContent,
  marketplaceSearch:          marketplace.marketplaceSearch,
  marketplaceGetByCategory:   marketplace.marketplaceGetByCategory,
  marketplaceGetByTag:        marketplace.marketplaceGetByTag,
  marketplaceGetTrending:     marketplace.marketplaceGetTrending,
  marketplaceGetByAuthor:     marketplace.marketplaceGetByAuthor,
  marketplaceCreateCollection: marketplace.marketplaceCreateCollection,
  marketplaceGetCollection:    marketplace.marketplaceGetCollection,
  marketplaceAddToCollection:  marketplace.marketplaceAddToCollection,
  marketplaceCreatorStats:    marketplace.marketplaceCreatorStats,
  marketplaceGetStats:        marketplace.marketplaceGetStats,

  // ── Group Chat ────────────────────────────────────────────────────
  groupCreate:        groupChat.groupCreate,
  groupGet:           groupChat.groupGet,
  groupUpdate:        groupChat.groupUpdate,
  groupDelete:        groupChat.groupDelete,
  groupJoin:          groupChat.groupJoin,
  groupLeave:         groupChat.groupLeave,
  groupKick:          groupChat.groupKick,
  groupBan:           groupChat.groupBan,
  groupUnban:         groupChat.groupUnban,
  groupSetRole:       groupChat.groupSetRole,
  groupGetMembers:    groupChat.groupGetMembers,
  groupSendMessage:   groupChat.groupSendMessage,
  groupGetMessages:   groupChat.groupGetMessages,
  groupDeleteMessage: groupChat.groupDeleteMessage,
  groupCreateInvite:  groupChat.groupCreateInvite,
  groupJoinByInvite:  groupChat.groupJoinByInvite,
  groupGetInvite:     groupChat.groupGetInvite,
  groupGetMy:         groupChat.groupGetMy,
  groupSearch:        groupChat.groupSearch,
  groupGetStats:      groupChat.groupGetStats,

  // ── Stories ───────────────────────────────────────────────────────
  storyPost:              stories.storyPost,
  storyGet:               stories.storyGet,
  storyGetUser:           stories.storyGetUser,
  storyGetFeed:           stories.storyGetFeed,
  storyView:              stories.storyView,
  storyDelete:            stories.storyDelete,
  storyGetViewers:        stories.storyGetViewers,
  storyReply:             stories.storyReply,
  storyGetReplies:        stories.storyGetReplies,
  storyDeleteReply:       stories.storyDeleteReply,
  storyCreateHighlight:   stories.storyCreateHighlight,
  storyGetHighlight:      stories.storyGetHighlight,
  storyGetHighlights:     stories.storyGetHighlights,
  storyDeleteHighlight:   stories.storyDeleteHighlight,
  storyGetStats:          stories.storyGetStats,

  // ── WebRTC Calls ──────────────────────────────────────────────────
  callInitiate:        calls.callInitiate,
  callAnswer:          calls.callAnswer,
  callReject:          calls.callReject,
  callEnd:             calls.callEnd,
  callGetSession:      calls.callGetSession,
  callAddIceCandidate: calls.callAddIceCandidate,
  callGetIceCandidates: calls.callGetIceCandidates,
  callGetIncoming:     calls.callGetIncoming,
  callGetActive:       calls.callGetActive,
  callGetHistory:      calls.callGetHistory,
  callTimeout:         calls.callTimeout,
  callGetStats:        calls.callGetStats,

  // ── Media Storage Options ─────────────────────────────────────
  getStoragePreference:  storage.getStoragePreference,
  setStoragePreference:  storage.setStoragePreference,
  connectGoogleDrive:    storage.connectGoogleDrive,
  disconnectGoogleDrive: storage.disconnectGoogleDrive,
  connectWeb3Storage:    storage.connectWeb3Storage,
  disconnectWeb3Storage: storage.disconnectWeb3Storage,
  getStorageStatus:      storage.getStorageStatus,

  // ── P2P Block Sync (Scenarios A, B, C) ──────────────────────────
  seedAnnounce:          p2pBlockSync.seedAnnounce,
  seedGetStatus:         p2pBlockSync.seedGetStatus,
  seedLookup:            p2pBlockSync.seedLookup,
  seedRemove:            p2pBlockSync.seedRemove,
  blockBuffer:           p2pBlockSync.blockBuffer,
  blockGet:              p2pBlockSync.blockGet,
  blockAck:              p2pBlockSync.blockAck,

  // ── File Transfer (Scenario B) ──────────────────────────────────
  transferCreate:        p2pBlockSync.transferCreate,
  transferList:          p2pBlockSync.transferList,
  transferAccept:        p2pBlockSync.transferAccept,
  transferDecline:       p2pBlockSync.transferDecline,
  transferCancel:        p2pBlockSync.transferCancel,
  transferProgress:      p2pBlockSync.transferProgress,
  transferBlockReceived: p2pBlockSync.transferBlockReceived,

  // ── Device Pairing (Scenario D) ────────────────────────────────
  pairGenerate:     p2pBlockSync.pairGenerate,
  pairVerify:       p2pBlockSync.pairVerify,
  pairList:         p2pBlockSync.pairList,
  pairUnpair:       p2pBlockSync.pairUnpair,
  deviceSyncDelta:  p2pBlockSync.deviceSyncDelta,
};
