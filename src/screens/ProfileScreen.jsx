import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../theme.js";
import sharePost from "../utils/sharePost.js";

// Sub-components
import ProfileHeader   from "./profile/ProfileHeader.jsx";
import ProfileTabs     from "./profile/ProfileTabs.jsx";
import PostFeed        from "./profile/PostFeed.jsx";
import SettingsSheet   from "./profile/SettingsSheet.jsx";
import EditProfileSheet from "./profile/EditProfileSheet.jsx";
import {
  AccountSettingsSheet,
  UserListSheet,
  RetweetSheet,
  ReplySheet,
} from "./profile/InteractionSheets.jsx";

// ── Main component — orchestrator ────────────────────────────────────────────
export default function ProfileScreen({
  me, viewingProfile, onLogout, onBack, p2p, onUpdateProfile,
  onModalOpen, onModalClose, isActive,
}) {
  const [activeTab,    setActiveTab]    = useState("posts");
  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [cursor,       setCursor]       = useState(0);
  const [counts,       setCounts]       = useState({ posts:0, media:0, likes:0, bookmarks:0 });
  const [followers,    setFollowers]    = useState(0);
  const [followingCnt, setFollowingCnt] = useState(0);
  const [globalMuted,  setGlobalMuted]  = useState(false);
  const [copyMsg,      setCopyMsg]      = useState(false);
  const [shareMsg,     setShareMsg]     = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [isFollowing,  setIsFollowing]  = useState(false);

  // Sheets
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showAccount,  setShowAccount]  = useState(false);
  const [showReply,    setShowReply]    = useState(null);
  const [showRetweet,  setShowRetweet]  = useState(null); // post to retweet/quote
  const [quoteText,    setQuoteText]    = useState("");
  const [replyText,    setReplyText]    = useState("");

  const [saving,       setSaving]       = useState(false);
  const [editForm,     setEditForm]     = useState({ name:"", bio:"", avatar:null, banner:null });
  const [avatarPrev,   setAvatarPrev]   = useState(null);
  const [bannerPrev,   setBannerPrev]   = useState(null);

  // Follower / following list
  const [showUserList, setShowUserList] = useState(null); // null | "followers" | "following"
  const [userList,    setUserList]      = useState([]);
  const [userListLoading, setUserListLoading] = useState(false);

  const scrollRef    = useRef(null);
  const touchStartY  = useRef(0);
  const pullDistance = useRef(0);
  const PAGE_SIZE    = 20;
  const wasActiveRef = useRef(false);

  // IMPORTANT: isMyProfile must be declared BEFORE any useEffect that references it,
  // otherwise JavaScript Temporal Dead Zone (TDZ) will crash the component.
  const isMyProfile = !viewingProfile || viewingProfile.userId === me.userId;
  const profileUser = isMyProfile ? me : viewingProfile;

  // ── Listen for external "open settings" events (from connection status dot) ──
  useEffect(() => {
    const handler = () => { if (isMyProfile) setShowSettings(true); };
    window.addEventListener("echo:open-settings", handler);
    return () => window.removeEventListener("echo:open-settings", handler);
  }, [isMyProfile]);

  // ── Check if viewing profile is followed ─────────────────────────────────────
  const checkFollowingStatus = useCallback(async () => {
    if (!p2p || isMyProfile) return;
    try {
      const followingRes = await p2p.getFollowing();
      const followingIds = (followingRes.users || []).map(u => u.userId);
      setIsFollowing(followingIds.includes(viewingProfile?.userId));
    } catch(e) { console.error("[Profile] checkFollowing failed:", e); }
  }, [p2p, isMyProfile, viewingProfile?.userId]);

  // ── Load first page ─────────────────────────────────────────────────────────
  const loadPage = useCallback(async (reset = false) => {
    if (!p2p) return;
    const isFirst = reset || posts.length === 0;
    if (isFirst) setLoading(true); else setLoadingMore(true);

    try {
      const userId = isMyProfile ? me.userId : viewingProfile?.userId;
      let fetched = [];
      let allPosts = [];

      if (activeTab === "bookmarks" && isMyProfile) {
        const r = await p2p.getBookmarks?.() || await p2p.getFeed();
        const all = (r.posts || []).filter(p => p.bookmarked);
        fetched = all;
        allPosts = r.posts || [];
      } else if (!isMyProfile) {
        // Other user's profile: fetch their posts directly from node
        const r = await p2p.getUserPosts?.({ userId, limit: 100 }) || { posts: [] };
        allPosts = r.posts || [];
        if (activeTab === "posts") {
          fetched = allPosts.filter(p => p.type !== "like" && p.type !== "retweet" && p.type !== "reply");
        } else if (activeTab === "media") {
          fetched = allPosts.filter(p => p.image || p.video);
        } else if (activeTab === "likes") {
          fetched = allPosts;
        }
      } else {
        // Own profile: use getFeed for all tabs
        const r = await p2p.getFeed();
        allPosts = r.posts || [];
        if (activeTab === "posts") {
          fetched = allPosts.filter(p => p.authorId === userId && p.type !== "like" && p.type !== "retweet");
        } else if (activeTab === "media") {
          fetched = allPosts.filter(p => p.authorId === userId && (p.image || p.video));
        } else if (activeTab === "likes") {
          fetched = allPosts.filter(p => p.liked);
        }
      }

      // Compute all counts from the single fetch
      if (isFirst && activeTab === "posts") {
        const uid  = isMyProfile ? me.userId : viewingProfile?.userId;
        const countSource = isMyProfile ? allPosts : allPosts;
        setCounts({
          posts:     countSource.filter(p => p.type !== "like" && p.type !== "retweet" && p.type !== "reply").length,
          media:     countSource.filter(p => p.image || p.video).length,
          likes:     isMyProfile ? countSource.filter(p => p.liked).length : countSource.filter(p => p.type === "like").length,
          bookmarks: isMyProfile ? countSource.filter(p => p.bookmarked).length : 0,
        });
        // Follower / following counts from getProfileStats
        try {
          const stats = await p2p.getProfileStats({ userId: uid });
          setFollowers(stats.followers || 0);
          setFollowingCnt(stats.following || 0);
        } catch(_) {}
      }

      const page = fetched.slice(0, PAGE_SIZE);
      // Patch own posts with current avatar/name (API may return stale data)
      const patched = isMyProfile && me ? page.map(p =>
        p.authorId === me.userId
          ? { ...p, authorAvatar: me.avatar, authorName: me.name }
          : p
      ) : page;
      setPosts(reset ? patched : prev => [...prev, ...patched]);
      setHasMore(fetched.length > PAGE_SIZE);
      setCursor(PAGE_SIZE);
    } catch(e) { console.error("[Profile] load failed:", e); }

    setLoading(false);
    setLoadingMore(false);
  }, [p2p, activeTab, isMyProfile, me.userId, viewingProfile?.userId]);

  // Reload on tab change or when viewingProfile changes
  useEffect(() => {
    setPosts([]);
    setCursor(0);
    setHasMore(true);
    loadPage(true);
    checkFollowingStatus();
  }, [p2p, activeTab, isMyProfile, me.userId, viewingProfile?.userId]);

  // ── Refresh when tab becomes active (e.g. after posting from home) ─────────
  useEffect(() => {
    if (isActive && wasActiveRef.current === false && posts.length > 0) {
      loadPage(true);
      checkFollowingStatus();
    }
    wasActiveRef.current = !!isActive;
  }, [isActive]);

  // ── Infinite scroll — load more when near bottom ────────────────────────────
  const onScroll = useCallback((e) => {
    if (loadingMore || !hasMore) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setLoadingMore(true);
      loadPage(false);
    }
  }, [loadingMore, hasMore, loadPage]);

  // ── Pull-to-refresh handlers ────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPage(true);
    checkFollowingStatus();
    setRefreshing(false);
  };

  const onTouchStart = (e) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e) => {
    if (touchStartY.current > 0 && scrollRef.current?.scrollTop === 0) {
      const dist = e.touches[0].clientY - touchStartY.current;
      if (dist > 0) pullDistance.current = Math.min(dist, 150);
    }
  };

  const onTouchEnd = () => {
    if (pullDistance.current > 80) {
      handleRefresh();
    }
    touchStartY.current = 0;
    pullDistance.current = 0;
  };

  // ── Post actions ────────────────────────────────────────────────────────────
  const handleLike = (postId, isLiked) => {
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, liked: !isLiked, likes: (p.likes||0) + (isLiked ? -1 : 1) }));
    isLiked ? p2p?.unlikePost({ postId }) : p2p?.likePost({ postId });
  };
  const handleDislike = (postId, isDisliked) => {
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, disliked: !isDisliked, dislikes: (p.dislikes||0) + (isDisliked ? -1 : 1) }));
    isDisliked ? p2p?.undislikePost?.({ postId }) : p2p?.dislikePost?.({ postId });
  };

  const handleBookmark = (postId, isBookmarked) => {
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, bookmarked: !isBookmarked }));
    p2p?.bookmarkPost({ postId });
  };

  const handleDelete = async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try { await p2p?.deletePost?.({ postId }); } catch(_) {}
  };

  // Retweet — opens X-style popup (retweet or quote)
  const handleRetweetTap = (post) => {
    setShowRetweet(post);
    setQuoteText("");
  };

  const doRetweet = async () => {
    if (!showRetweet || !p2p) return;
    await p2p.retweetPost({ postId: showRetweet.id });
    setPosts(prev => prev.map(p => p.id !== showRetweet.id ? p : { ...p, retweeted: true, retweets: (p.retweets||0)+1 }));
    setShowRetweet(null);
  };

  const doQuote = async () => {
    if (!showRetweet || !quoteText.trim() || !p2p) return;
    await p2p.createPost({ text: quoteText.trim() + "\n\n↩ @" + showRetweet.authorHandle + ": " + (showRetweet.text || "").slice(0, 80) });
    setShowRetweet(null);
    loadPage(true);
  };

  // Share
  const handleShare = async (post) => {
    const result = await sharePost(post);
    if (result === "copied") { setShareMsg(true); setTimeout(() => setShareMsg(false), 2000); }
  };

  // Copy profile ID
  const copyId = () => {
    try {
      navigator.clipboard?.writeText(profileUser.userId || "");
      setCopyMsg(true);
      setTimeout(() => setCopyMsg(false), 2000);
    } catch(_) {}
  };

  // ── Open followers / following list ──────────────────────────────────────────
  const openUserList = async (type) => {
    if (!p2p) return;
    setShowUserList(type);
    setUserListLoading(true);
    try {
      const uid = isMyProfile ? me.userId : viewingProfile?.userId;
      let users = [];
      if (type === "following") {
        const r = await p2p.getFollowing({ userId: uid });
        users = r.users || [];
      } else {
        const r = await p2p.getFollowers({ userId: uid });
        users = r.users || [];
      }
      setUserList(users);
    } catch(e) {
      console.error("[Profile] openUserList failed:", e);
      setUserList([]);
    }
    setUserListLoading(false);
  };

  // ── Follow / Unfollow handlers ──────────────────────────────────────────────
  const handleFollow = async () => {
    if (!viewingProfile?.userId || !p2p) return;
    await p2p.followUser({ userId: viewingProfile.userId });
    setIsFollowing(true);
    try {
      const stats = await p2p.getProfileStats({ userId: viewingProfile.userId });
      setFollowers(stats.followers || 0);
    } catch(_) {
      setFollowers(prev => prev + 1);
    }
  };

  const handleUnfollow = async () => {
    if (!viewingProfile?.userId || !p2p) return;
    await p2p.unfollowUser({ userId: viewingProfile.userId });
    setIsFollowing(false);
    setFollowingCnt(prev => Math.max(0, prev - 1));
    try {
      const stats = await p2p.getProfileStats({ userId: viewingProfile.userId });
      setFollowers(stats.followers || 0);
      setFollowingCnt(stats.following || 0);
    } catch(_) {}
  };

  // ── Message handler ─────────────────────────────────────────────────────────
  const handleMessage = async () => {
    if (!viewingProfile?.userId || !p2p) return;
    try {
      await p2p.sendMessage({
        recipientId: viewingProfile.userId,
        text: "👋 Hey!"
      });
      alert("Conversation started! Check your Messages tab.");
    } catch(err) {
      console.error("Failed to start conversation:", err);
      alert("Failed to start conversation: " + err.message);
    }
  };

  // ── Save profile ────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:   editForm.name.trim(),
        bio:    editForm.bio.trim(),
        avatar: editForm.avatar || undefined,
        banner: editForm.banner || undefined,
      };
      const result = p2p?.updateProfile
        ? await p2p.updateProfile(payload)
        : await p2p?.setupProfile({ name: payload.name, handle: me.handle, bio: payload.bio });

      onUpdateProfile?.({
        name:   payload.name,
        bio:    payload.bio,
        avatar: result?.avatar || editForm.avatar || me.avatar,
        banner: result?.banner || editForm.banner || me.banner,
      });
      setShowEdit(false);
      setAvatarPrev(null);
      setBannerPrev(null);
    } catch(e) { console.error("saveProfile:", e); }
    setSaving(false);
  };

  // ── Edit profile helpers ────────────────────────────────────────────────────
  const openEditProfile = () => {
    setEditForm({ name: me.name||"", bio: me.bio||"", avatar:null, banner:null });
    setAvatarPrev(null);
    setBannerPrev(null);
    setShowEdit(true);
  };

  // ── Delete account ──────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    try { await p2p?.deleteAccount?.(); } catch(_) {}
    onLogout?.();
  };

  // ── Reply handler ───────────────────────────────────────────────────────────
  const handleReplyOpen = (post) => {
    setShowReply(post);
    setReplyText("");
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !p2p) return;
    await p2p.replyToPost({ postId: showReply.id, text });
    setReplyText("");
    setShowReply(null);
    loadPage(true);
  };

  const displayAvatar = avatarPrev || profileUser.avatar;
  const displayBanner = bannerPrev || profileUser.banner;

  return (
    <div ref={scrollRef} onScroll={onScroll}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ flex:1, overflowY:"auto", position:"relative" }}>

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div style={{ padding:12, textAlign:"center", background:C.surface, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ color:C.accent, fontSize:13 }}>Refreshing…</span>
        </div>
      )}

      {/* ── Profile Header ── */}
      <ProfileHeader
        profileUser={profileUser}
        isMyProfile={isMyProfile}
        displayAvatar={displayAvatar}
        displayBanner={displayBanner}
        followers={followers}
        followingCnt={followingCnt}
        isFollowing={isFollowing}
        copyMsg={copyMsg}
        copyId={copyId}
        openUserList={openUserList}
        onBack={onBack}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onMessage={handleMessage}
      />

      {/* ── Profile Tabs ── */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      {/* ── Post Feed ── */}
      <PostFeed
        posts={posts}
        loading={loading}
        loadingMore={loadingMore}
        activeTab={activeTab}
        isMyProfile={isMyProfile}
        globalMuted={globalMuted}
        onLike={handleLike}
        onDislike={handleDislike}
        onRetweet={handleRetweetTap}
        onBookmark={handleBookmark}
        onDelete={handleDelete}
        onReply={handleReplyOpen}
        onShare={handleShare}
        onToggleMute={() => setGlobalMuted(m => !m)}
        shareMsg={shareMsg}
      />

      {/* ════════════ SETTINGS SHEET ════════════ */}
      <SettingsSheet
        show={showSettings}
        onClose={() => setShowSettings(false)}
        p2p={p2p}
        onModalOpen={onModalOpen}
        onModalClose={onModalClose}
        onOpenEdit={openEditProfile}
        onOpenAccount={() => setShowAccount(true)}
      />

      {/* ════════════ EDIT PROFILE SHEET ════════════ */}
      <EditProfileSheet
        show={showEdit}
        onClose={() => setShowEdit(false)}
        onModalOpen={onModalOpen}
        onModalClose={onModalClose}
        me={me}
        editForm={editForm}
        setEditForm={setEditForm}
        avatarPrev={avatarPrev}
        bannerPrev={bannerPrev}
        setAvatarPrev={setAvatarPrev}
        setBannerPrev={setBannerPrev}
        saving={saving}
        onSave={saveProfile}
      />

      {/* ════════════ ACCOUNT SETTINGS SHEET ════════════ */}
      <AccountSettingsSheet
        show={!!showAccount}
        onClose={() => setShowAccount(false)}
        onModalOpen={onModalOpen}
        onModalClose={onModalClose}
        onLogout={onLogout}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* ════════════ FOLLOWERS / FOLLOWING LIST SHEET ════════════ */}
      <UserListSheet
        show={!!showUserList}
        onClose={() => setShowUserList(null)}
        onModalOpen={onModalOpen}
        onModalClose={onModalClose}
        userListType={showUserList}
        userList={userList}
        userListLoading={userListLoading}
        me={me}
      />

      {/* ════════════ RETWEET SHEET (X-style) ════════════ */}
      <RetweetSheet
        show={!!showRetweet}
        onClose={() => setShowRetweet(null)}
        onModalOpen={onModalOpen}
        onModalClose={onModalClose}
        showRetweet={showRetweet}
        quoteText={quoteText}
        setQuoteText={setQuoteText}
        onRetweet={doRetweet}
        onQuote={doQuote}
      />

      {/* ════════════ REPLY SHEET ════════════ */}
      <ReplySheet
        show={!!showReply}
        onClose={() => setShowReply(null)}
        onModalOpen={onModalOpen}
        onModalClose={onModalClose}
        showReply={showReply}
        replyText={replyText}
        setReplyText={setReplyText}
        onSendReply={handleSendReply}
      />

    </div>
  );
}
