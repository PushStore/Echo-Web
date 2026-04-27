import { C } from "../../theme.js";
import EchoLogo from "../../components/EchoLogo.jsx";
import Avatar from "../../components/Avatar.jsx";

// ── Profile Header: banner, avatar, name/bio, action buttons, follower counts, copy ID ──
export default function ProfileHeader({
  profileUser, isMyProfile, displayAvatar, displayBanner,
  followers, followingCnt, isFollowing,
  copyMsg, copyId,
  openUserList, onBack,
  onFollow, onUnfollow, onMessage,
}) {
  return (
    <>
      {/* ── Back button — overlaid on banner (only when viewing OTHER profiles) ── */}
      {onBack && !isMyProfile && (
        <button onClick={onBack} style={{
          position:"absolute", top:"calc(env(safe-area-inset-top) + 8px)", left:12, zIndex:20,
          background:"rgba(255,255,255,.85)", backdropFilter:"blur(10px)",
          border:"none", borderRadius:"50%", width:32, height:32,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:C.text, fontSize:18, cursor:"pointer",
          boxShadow:"0 2px 8px rgba(0,0,0,.15)",
          WebkitTapHighlightColor:"transparent",
        }}>←</button>
      )}

      {/* ── Banner ── */}
      <div style={{
        height:120,
        background: displayBanner ? `url(${displayBanner}) center/cover` : "linear-gradient(135deg,#e8e8e8,#d0d0d0)",
        position:"relative",
      }}>
        {!displayBanner && (
          <div style={{ position:"absolute", right:20, top:"50%", transform:"translateY(-50%)", opacity:0.2 }}>
            <EchoLogo size={80}/>
          </div>
        )}
        <div style={{ position:"absolute", bottom:-36, left:16 }}>
          <Avatar src={displayAvatar} seed={profileUser.userId || profileUser.handle} size={76} style={{ border:"3px solid #fff", boxShadow:"0 2px 8px rgba(0,0,0,.12)" }}/>
        </div>
      </div>

      {/* ── Action buttons row — Follow + Message (other users only) ── */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, padding:"10px 14px 0" }}>
        {!isMyProfile && (
          <>
            {/* Message Button */}
            <button onClick={onMessage} style={{ background:C.bgSecondary, border:`1px solid ${C.border}`, borderRadius:20, padding:"8px 20px", color:C.text, fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Message
            </button>
            {/* Follow/Unfollow Button */}
            <button onClick={isFollowing ? onUnfollow : onFollow} style={{ background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, border:"none", borderRadius:20, padding:"8px 20px", color:"#000", fontWeight:800, fontSize:14, cursor:"pointer" }}>
              {isFollowing ? "Following" : "Follow"}
            </button>
          </>
        )}
      </div>

      {/* ── Bio block ── */}
      <div style={{ padding:"36px 16px 0" }}>
        <div style={{ fontWeight:800, color:C.text, fontSize:20 }}>{profileUser.name}</div>
        <div style={{ color:C.muted, fontSize:14, margin:"2px 0 8px" }}>@{profileUser.handle}</div>
        {profileUser.bio && <p style={{ color:C.text, fontSize:15, margin:"0 0 10px", lineHeight:1.5 }}>{profileUser.bio}</p>}

        {/* Followers / Following */}
        <div style={{ display:"flex", gap:20, marginBottom:10 }}>
          <span onClick={() => openUserList("following")} style={{ color:C.text, fontSize:14, cursor:"pointer" }}>
            <strong>{followingCnt}</strong>{" "}
            <span style={{ color:C.muted }}>Following</span>
          </span>
          <span onClick={() => openUserList("followers")} style={{ color:C.text, fontSize:14, cursor:"pointer" }}>
            <strong>{followers}</strong>{" "}
            <span style={{ color:C.muted }}>Followers</span>
          </span>
        </div>

        {/* Full copyable ID */}
        <div onClick={copyId} style={{
          display:"flex", alignItems:"center", gap:8,
          background:C.surface, borderRadius:10, padding:"10px 12px",
          border:`1px solid ${C.border}`, cursor:"pointer", marginTop:4,
        }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:C.accent, flexShrink:0 }}/>
          <span style={{ color:C.muted, fontSize:10, fontFamily:"monospace", flex:1, wordBreak:"break-all" }}>
            {profileUser.userId || "key loading…"}
          </span>
          <span style={{ color: copyMsg ? C.accent : C.muted, fontSize:11, flexShrink:0, fontWeight:600 }}>
            {copyMsg ? "Copied!" : "Copy ID"}
          </span>
        </div>
      </div>
    </>
  );
}
