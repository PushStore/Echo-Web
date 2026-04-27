import { C } from "../../theme.js";
import PostCard from "../../components/PostCard.jsx";

// ── Post Feed: renders the post list with loading/empty states ──
export default function PostFeed({
  posts, loading, loadingMore, activeTab, isMyProfile, globalMuted,
  onLike, onDislike, onRetweet, onBookmark, onDelete, onReply,
  onShare, onToggleMute, shareMsg,
}) {
  const emptyMessages = {
    posts:     isMyProfile ? "No posts yet. Share your first echo!" : "No posts yet.",
    media:     "No media yet.",
    likes:     "No liked posts yet.",
    bookmarks: "No bookmarks yet.",
  };

  return (
    <>
      {loading && <div style={{ padding:32, textAlign:"center", color:C.muted }}>Loading…</div>}
      {!loading && posts.length === 0 && (
        <div style={{ padding:40, textAlign:"center", color:C.muted }}>
          {emptyMessages[activeTab] || ""}
        </div>
      )}
      {posts.map(p => (
        <PostCard key={p.id} post={p}
          onLike={id => onLike(id, p.liked)}
          onDislike={id => onDislike(id, p.disliked)}
          onRetweet={post => onRetweet(typeof post === "object" ? post : p)}
          onBookmark={id => onBookmark(id, p.bookmarked)}
          onDelete={onDelete}
          onReply={post => onReply(post)}
          onShare={onShare}
          muted={globalMuted}
          onToggleMute={onToggleMute}
        />
      ))}
      {loadingMore && <div style={{ padding:16, textAlign:"center", color:C.muted, fontSize:13 }}>Loading more…</div>}

      {/* ── Share toast ── */}
      {shareMsg && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:"10px 20px", color:C.text, fontSize:14, zIndex:200 }}>
          Link copied to clipboard
        </div>
      )}
    </>
  );
}
