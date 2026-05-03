// File: src/p2p.js
// p2p.js — Native Capacitor bridge to the Java P2P layer
// Used on Android device. In browser, p2p-mock.js is used instead.
// Both export { P2PCore } with the same interface.
import { registerPlugin } from './capacitor-core-shim.js';

// Registers the native Java plugin (P2PCorePlugin.java)
const _native = registerPlugin('P2PCore');

// Export as P2PCore so both p2p.js and p2p-mock.js have the same export name
export const P2PCore = {
    // ── Feed ──────────────────────────────────────────────────────────────────
    getFeed:                 ({ cursor, limit } = {}) => _native.getFeed({ cursor, limit }),
    getForYouFeed:           ({ limit } = {}) => _native.getForYouFeed({ limit }),
    getTrendingFollowingFeed: ({ limit } = {}) => _native.getTrendingFollowingFeed({ limit }),

    // ── Posts ─────────────────────────────────────────────────────────────────
    createPost:    ({ text, image, video }) => _native.createPost({ text, image, video }),
    likePost:      ({ postId }) => _native.likePost({ postId }),
    unlikePost:    ({ postId }) => _native.unlikePost({ postId }),
    retweetPost:   ({ postId }) => _native.retweetPost({ postId }),
    replyToPost:   ({ postId, text }) => _native.replyToPost({ postId, text }),
    bookmarkPost:  ({ postId }) => _native.bookmarkPost({ postId }),
    deletePost:    ({ postId }) => _native.deletePost({ postId }),
    getBookmarks:  () => _native.getBookmarks(),
    getUserPosts:  ({ userId, limit } = {}) => _native.getUserPosts({ userId, limit }),

    // ── Identity ──────────────────────────────────────────────────────────────
    getMyProfile:         ()                      => _native.getMyProfile(),
    setupProfile:         ({ name, handle, bio="" }) => _native.setupProfile({ name, handle, bio }),
    checkHandleAvailable: ({ handle })            => _native.checkHandleAvailable({ handle }),
    updateProfile:        ({ name, bio, avatar, banner }) => _native.updateProfile({ name, bio, avatar, banner }),
    deleteAccount:        ()                      => _native.deleteAccount(),

    // ── Social ────────────────────────────────────────────────────────────────
    followUser:      ({ userId }) => _native.followUser({ userId }),
    unfollowUser:    ({ userId }) => _native.unfollowUser({ userId }),
    getFollowing:    ({ userId } = {}) => _native.getFollowing({ userId }),
    getFollowers:    ({ userId }) => _native.getFollowers({ userId }),
    getProfileStats: ({ userId }) => _native.getProfileStats({ userId }),
    searchUsers:     ({ query })  => _native.searchUsers({ query }),
    getFollowingFeed: ({ cursor, limit } = {}) => _native.getFollowingFeed({ cursor, limit }),

    // ── Social Profile Lookup (via Mother Ship tunnel to port 6881) ───────
    socialGetUser:         ({ userId }) => _native.socialGetUser({ userId }),
    socialGetUserByHandle: ({ handle }) => _native.socialGetUserByHandle({ handle }),

    // ── Direct Messages ───────────────────────────────────────────────────────
    sendMessage: ({ recipientId, text, image, video, audio, duration, file, fileName, fileSize, fileType }) =>
                             _native.sendMessage({ recipientId, text, image, video, audio, duration, file, fileName, fileSize, fileType }),
    getConversations:    () => _native.getConversations(),
    getMessages:         ({ conversationId, limit }) => _native.getMessages({ conversationId, limit }),
    deleteMessage:       ({ messageId }) => _native.deleteMessage({ messageId }),
    deleteConversation:  ({ conversationId }) => _native.deleteConversation({ conversationId }),
    getTotalUnreadCount: () => _native.getTotalUnreadCount(),

    // ── Echo Node Relay ─────────────────────────────────────────────────────
    connectToEchoNode:   ({ url }) => _native.connectToEchoNode({ url }),
    disconnectEchoNode:  ()      => _native.disconnectEchoNode(),
    getEchoNodeStatus:   ()      => _native.getEchoNodeStatus(),

    // ── Mother Ship Relay ──────────────────────────────────────────────────
    connectToMothership:       ({ publicKey }) => _native.connectToMothership({ publicKey }),
    disconnectFromMothership:  ()                => _native.disconnectFromMothership(),
    getMothershipStatus:       ()                => _native.getMothershipStatus(),
    sendDmViaMothership:       ({ recipientId, encryptedContent, messageType, conversationId }) =>
                                   _native.sendDmViaMothership({ recipientId, encryptedContent, messageType, conversationId }),
    requestNearbyNode:         ()                => _native.requestNearbyNode(),

    // ── Network ───────────────────────────────────────────────────────────────
    getNetworkStatus: () => _native.getNetworkStatus(),
    startService:     () => _native.startService(),
    stopService:      () => _native.stopService(),

    // ── Phase 5 PR1: Push Notifications ──────────────────────────────────
    registerForPushNotifications:  () => _native.registerForPushNotifications(),
    unregisterPushNotifications: () => _native.unregisterPushNotifications(),
    getPushNotificationStatus:    () => _native.getPushNotificationStatus(),

    // ── Phase 5 PR2: Identity Verification ──────────────────────────────
    identityGetStatus()  { return _native.identityGetStatus() },
    identityChallenge({ targetUserId }) { return _native.identityChallenge({ targetUserId }) },
    identityVerify({ challengeId, responseSignature, responderPublicKey }) { return _native.identityVerify({ challengeId, responseSignature, responderPublicKey }) },
    identityRotateKey({ userId, oldPublicKey, newPublicKey, rotationSignature, timestamp }) { return _native.identityRotateKey({ userId, oldPublicKey, newPublicKey, rotationSignature, timestamp }) },
    identityGetKeys({ userId }) { return _native.identityGetKeys({ userId }) },
    identitySetTrust({ userId, publicKey, trustLevel }) { return _native.identitySetTrust({ userId, publicKey, trustLevel }) },
    identityVerifyPrekey({ publicKey, prekeyPublic, prekeySignature }) { return _native.identityVerifyPrekey({ publicKey, prekeyPublic, prekeySignature }) },

    // ── Phase 5 PR3: Backup & Restore ───────────────────────────────────
    backupCreate({ includeMessages, password }) { return _native.backupCreate({ includeMessages, password }) },
    backupRestore({ data, password }) { return _native.backupRestore({ data, password }) },
    backupVerify({ data, password }) { return _native.backupVerify({ data, password }) },
    backupDhtStore() { return _native.backupDhtStore() },
    backupDhtRestore({ userId }) { return _native.backupDhtRestore({ userId }) },
    backupGetStatus() { return _native.backupGetStatus() },

    // ── Phase 5 PR4: Multi-Device Sync ──────────────────────────────────
    deviceRegister({ deviceId, deviceName, deviceType, publicKey, prekey, capabilities }) { return _native.deviceRegister({ deviceId, deviceName, deviceType, publicKey, prekey, capabilities }) },
    deviceList({ userId }) { return _native.deviceList({ userId }) },
    deviceHeartbeat({ deviceId }) { return _native.deviceHeartbeat({ deviceId }) },
    deviceRevoke({ deviceId, userId }) { return _native.deviceRevoke({ deviceId, userId }) },
    deviceGetStatus() { return _native.deviceGetStatus() },
    syncGetDevices({ userId }) { return _native.syncGetDevices({ userId }) },
    syncPullDevice({ deviceId, lastSyncVersion }) { return _native.syncPullDevice({ deviceId, lastSyncVersion }) },
    syncPushDevice({ deviceId, mutations, versionVector }) { return _native.syncPushDevice({ deviceId, mutations, versionVector }) },

    // ── Phase 5 PR5: Content Marketplace ────────────────────────────────
    marketplacePublish({ title, description, contentType, category, tags, mediaUrl, price }) { return _native.marketplacePublish({ title, description, contentType, category, tags, mediaUrl, price }) },
    marketplaceGetContent({ contentId }) { return _native.marketplaceGetContent({ contentId }) },
    marketplaceSearch({ query, offset, limit }) { return _native.marketplaceSearch({ query, offset, limit }) },
    marketplaceGetByCategory({ category, offset, limit }) { return _native.marketplaceGetByCategory({ category, offset, limit }) },
    marketplaceGetByTag({ tag, offset, limit }) { return _native.marketplaceGetByTag({ tag, offset, limit }) },
    marketplaceGetTrending({ category, limit }) { return _native.marketplaceGetTrending({ category, limit }) },
    marketplaceGetByAuthor({ authorId, offset, limit }) { return _native.marketplaceGetByAuthor({ authorId, offset, limit }) },
    marketplaceCreateCollection({ name, description, contentIds, isPublic }) { return _native.marketplaceCreateCollection({ name, description, contentIds, isPublic }) },
    marketplaceGetCollection({ collectionId }) { return _native.marketplaceGetCollection({ collectionId }) },
    marketplaceAddToCollection({ collectionId, contentId }) { return _native.marketplaceAddToCollection({ collectionId, contentId }) },
    marketplaceCreatorStats({ authorId }) { return _native.marketplaceCreatorStats({ authorId }) },
    marketplaceGetStats() { return _native.marketplaceGetStats() },

    // ── Phase 5 PR6: Group Chat ─────────────────────────────────────────
    groupCreate({ name, description, maxMembers, avatarUrl, creatorId }) { return _native.groupCreate({ creatorId, name, description, maxMembers, avatarUrl }) },
    groupGet({ groupId }) { return _native.groupGet({ groupId }) },
    groupUpdate({ groupId, name, description, avatarUrl }) { return _native.groupUpdate({ groupId, name, description, avatarUrl }) },
    groupDelete({ groupId }) { return _native.groupDelete({ groupId }) },
    groupJoin({ groupId }) { return _native.groupJoin({ groupId }) },
    groupLeave({ groupId }) { return _native.groupLeave({ groupId }) },
    groupKick({ groupId, userId }) { return _native.groupKick({ groupId, userId }) },
    groupBan({ groupId, userId }) { return _native.groupBan({ groupId, userId }) },
    groupUnban({ groupId, userId }) { return _native.groupUnban({ groupId, userId }) },
    groupSetRole({ groupId, userId, role }) { return _native.groupSetRole({ groupId, userId, role }) },
    groupGetMembers({ groupId }) { return _native.groupGetMembers({ groupId }) },
    groupSendMessage({ groupId, encryptedContent, messageType, mediaUrl }) { return _native.groupSendMessage({ groupId, encryptedContent, messageType, mediaUrl }) },
    groupGetMessages({ groupId, offset, limit }) { return _native.groupGetMessages({ groupId, offset, limit }) },
    groupDeleteMessage({ groupId, messageId }) { return _native.groupDeleteMessage({ groupId, messageId }) },
    groupCreateInvite({ groupId, expiresInHours, maxUses }) { return _native.groupCreateInvite({ groupId, expiresInHours, maxUses }) },
    groupJoinByInvite({ inviteCode }) { return _native.groupJoinByInvite({ inviteCode }) },
    groupGetInvite({ inviteCode }) { return _native.groupGetInvite({ inviteCode }) },
    groupGetMy() { return _native.groupGetMy() },
    groupSearch({ query }) { return _native.groupSearch({ query }) },
    groupGetStats({ groupId }) { return _native.groupGetStats({ groupId }) },

    // ── Phase 5 PR7: Stories ────────────────────────────────────────────
    storyPost({ mediaUrl, mediaType, caption, type, duration, thumbnailUrl }) { return _native.storyPost({ mediaUrl, mediaType, caption, type, duration, thumbnailUrl }) },
    storyGet({ storyId }) { return _native.storyGet({ storyId }) },
    storyGetUser({ authorId }) { return _native.storyGetUser({ authorId }) },
    storyGetFeed({ maxPerUser }) { return _native.storyGetFeed({ maxPerUser }) },
    storyView({ storyId }) { return _native.storyView({ storyId }) },
    storyDelete({ storyId }) { return _native.storyDelete({ storyId }) },
    storyGetViewers({ storyId }) { return _native.storyGetViewers({ storyId }) },
    storyReply({ storyId, content }) { return _native.storyReply({ storyId, content }) },
    storyGetReplies({ storyId, offset, limit }) { return _native.storyGetReplies({ storyId, offset, limit }) },
    storyDeleteReply({ storyId, replyId }) { return _native.storyDeleteReply({ storyId, replyId }) },
    storyCreateHighlight({ title, storyIds, coverUrl }) { return _native.storyCreateHighlight({ title, storyIds, coverUrl }) },
    storyGetHighlight({ highlightId }) { return _native.storyGetHighlight({ highlightId }) },
    storyGetHighlights({ authorId }) { return _native.storyGetHighlights({ authorId }) },
    storyDeleteHighlight({ highlightId }) { return _native.storyDeleteHighlight({ highlightId }) },
    storyGetStats() { return _native.storyGetStats() },

    // ── Media Storage Options ─────────────────────────────────────
    getStoragePreference: () => _native.getStoragePreference(),
    setStoragePreference: ({ storageType }) => _native.setStoragePreference({ storageType }),
    connectGoogleDrive:   ({ accessToken, refreshToken, serverAuthCode, expiresIn }) => _native.connectGoogleDrive({ accessToken, refreshToken, serverAuthCode, expiresIn }),
    disconnectGoogleDrive:() => _native.disconnectGoogleDrive(),
    connectWeb3Storage:   ({ delegationToken, did, email }) => _native.connectWeb3Storage({ delegationToken, did, email }),
    disconnectWeb3Storage:() => _native.disconnectWeb3Storage(),
    getStorageStatus:     () => _native.getStorageStatus(),

    // ── Phase 5 PR8: WebRTC Calls ───────────────────────────────────────
    callInitiate({ calleeId, callerId, callType, offerSdp }) { return _native.callInitiate({ calleeId, callerId, callType, offerSdp }) },
    callAnswer({ sessionId, answerSdp }) { return _native.callAnswer({ sessionId, answerSdp }) },
    callReject({ sessionId }) { return _native.callReject({ sessionId }) },
    callEnd({ sessionId }) { return _native.callEnd({ sessionId }) },
    callGetSession({ sessionId }) { return _native.callGetSession({ sessionId }) },
    callAddIceCandidate({ sessionId, candidate, sdpMid, sdpMLineIndex }) { return _native.callAddIceCandidate({ sessionId, candidate, sdpMid, sdpMLineIndex }) },
    callGetIceCandidates({ sessionId, sinceTimestamp }) { return _native.callGetIceCandidates({ sessionId, sinceTimestamp }) },
    callGetIncoming() { return _native.callGetIncoming() },
    callGetActive() { return _native.callGetActive() },
    callGetHistory({ limit }) { return _native.callGetHistory({ limit }) },
    callTimeout({ sessionId }) { return _native.callTimeout({ sessionId }) },
    callGetStats() { return _native.callGetStats() },

    // ── P2P Block Sync (Scenarios A, B, C) ────────────────────────────
    seedAnnounce:          ({ mediaHash, deviceId, listingId, manifest, ttlMinutes }) => _native.seedAnnounce({ mediaHash, deviceId, listingId, manifest, ttlMinutes }),
    seedGetStatus:         ()                      => _native.seedGetStatus(),
    seedLookup:            ({ mediaHash })           => _native.seedLookup({ mediaHash }),
    seedRemove:            ({ mediaHash, deviceId }) => _native.seedRemove({ mediaHash, deviceId }),
    blockBuffer:           ({ fileHash, blockIndex, data }) => _native.blockBuffer({ fileHash, blockIndex, data }),
    blockGet:              ({ fileHash, blockIndex }) => _native.blockGet({ fileHash, blockIndex }),
    blockAck:              ({ fileHash, blockIndex }) => _native.blockAck({ fileHash, blockIndex }),

    // ── File Transfer (Scenario B) ─────────────────────────────────────
    transferCreate:        ({ fileHash, fileName, fileSize, mimeType, recipientId, manifest }) => _native.transferCreate({ fileHash, fileName, fileSize, mimeType, recipientId, manifest }),
    transferList:          ({ status })              => _native.transferList({ status }),
    transferAccept:        ({ sessionId })           => _native.transferAccept({ sessionId }),
    transferDecline:       ({ sessionId })           => _native.transferDecline({ sessionId }),
    transferCancel:        ({ sessionId })           => _native.transferCancel({ sessionId }),
    transferProgress:      ({ sessionId })           => _native.transferProgress({ sessionId }),
    transferBlockReceived: ({ sessionId, blockIndex }) => _native.transferBlockReceived({ sessionId, blockIndex }),

    // ── Device Pairing (Scenario D) ────────────────────────────────────
    pairGenerate:     ({ label })           => _native.pairGenerate({ label }),
    pairVerify:       ({ token, deviceName, deviceType, publicKey }) => _native.pairVerify({ token, deviceName, deviceType, publicKey }),
    pairList:         ()                    => _native.pairList(),
    pairUnpair:       ({ pairingId })       => _native.pairUnpair({ pairingId }),
    deviceSyncDelta:  ({ deviceId })        => _native.deviceSyncDelta({ deviceId }),
};

// ── BLE Mesh ────────────────────────────────────────────────────────────
export { BleMesh } from './ble';
