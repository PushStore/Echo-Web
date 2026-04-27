import { C } from "../../theme.js";
import Sheet from "../../components/Sheet.jsx";
import Avatar from "../../components/Avatar.jsx";

// ── Account Settings Sheet ──────────────────────────────────────────────────
export function AccountSettingsSheet({ show, onClose, onModalOpen, onModalClose, onLogout, onDeleteAccount }) {
  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose} title="Account settings">
      <button onClick={() => { onClose(); onLogout?.(); }}
        style={{ width:"100%", background:"none", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 0", color:C.text, fontWeight:700, fontSize:16, cursor:"pointer", marginBottom:12 }}>
        Log out
      </button>
      <button onClick={async () => { onClose(); await onDeleteAccount(); }}
        style={{ width:"100%", background:"none", border:`1px solid ${C.danger}`, borderRadius:12, padding:"14px 0", color:C.danger, fontWeight:700, fontSize:16, cursor:"pointer", marginBottom:8 }}>
        Delete account
      </button>
      <p style={{ color:C.muted, fontSize:12, textAlign:"center", margin:"0 0 16px" }}>Deleting your account is permanent and cannot be undone.</p>
      <button onClick={onClose} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"10px 0", color:C.muted, fontSize:16 }}>Cancel</button>
    </Sheet>
  );
}

// ── Followers / Following List Sheet ────────────────────────────────────────
export function UserListSheet({ show, onClose, onModalOpen, onModalClose, userListType, userList, userListLoading, me }) {
  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose} title={userListType === "followers" ? "Followers" : "Following"}>
      {userListLoading && <div style={{ padding:24, textAlign:"center", color:C.muted }}>Loading…</div>}
      {!userListLoading && userList.length === 0 && (
        <div style={{ padding:32, textAlign:"center", color:C.muted }}>
          No {userListType === "followers" ? "followers" : "following"} yet.
        </div>
      )}
      {!userListLoading && userList.map(u => (
        <div key={u.userId} onClick={() => {
          onClose();
        }} style={{
          display:"flex", alignItems:"center", gap:12,
          padding:"12px 0", borderBottom:`1px solid ${C.border}`,
          cursor:"pointer", WebkitTapHighlightColor:"transparent",
        }}>
          <Avatar src={u.avatar} seed={u.userId} size={42}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, color:C.text, fontSize:14.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {u.name || "Unknown"}
            </div>
            <div style={{ color:C.muted, fontSize:13 }}>
              @{u.handle || "unknown"}
            </div>
          </div>
          {u.userId !== me.userId && (
            <span style={{ color:C.muted, fontSize:12, flexShrink:0 }}>
              {userListType === "following" ? "Following" : "Follows you"}
            </span>
          )}
          {u.userId === me.userId && (
            <span style={{ color:C.accent, fontSize:11, background:"rgba(110,231,183,0.12)", borderRadius:8, padding:"1px 7px", flexShrink:0 }}>You</span>
          )}
        </div>
      ))}
    </Sheet>
  );
}

// ── Retweet Sheet (X-style) ────────────────────────────────────────────────
export function RetweetSheet({ show, onClose, onModalOpen, onModalClose, showRetweet, quoteText, setQuoteText, onRetweet, onQuote }) {
  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose}>
      {showRetweet && (
        <>
          {/* Original post preview */}
          <div style={{ background:C.surface, borderRadius:10, padding:12, marginBottom:16, border:`1px solid ${C.border}` }}>
            <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>@{showRetweet.authorHandle}</div>
            <div style={{ color:C.text, fontSize:14, lineHeight:1.4 }}>{(showRetweet.text||"").slice(0,120)}{(showRetweet.text||"").length>120?"…":""}</div>
          </div>
          {/* Repost */}
          <button onClick={onRetweet}
            style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 0", WebkitTapHighlightColor:"transparent" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
            <div style={{ textAlign:"left" }}>
              <div style={{ color:C.text, fontSize:16, fontWeight:700 }}>Repost</div>
              <div style={{ color:C.muted, fontSize:12 }}>Share without comment</div>
            </div>
          </button>
          {/* Quote */}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:4 }}>
            <div style={{ color:C.muted, fontSize:13, marginBottom:8 }}>Quote with comment</div>
            <textarea value={quoteText} onChange={e => setQuoteText(e.target.value)}
              placeholder="Add a comment…" rows={3}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:15, resize:"none", outline:"none", boxSizing:"border-box" }}
            />
            <button onClick={onQuote} disabled={!quoteText.trim()}
              style={{ width:"100%", background: quoteText.trim() ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface, border:"none", borderRadius:24, padding:"12px 0", color: quoteText.trim() ? "#000" : C.muted, fontWeight:800, fontSize:15, cursor: quoteText.trim() ? "pointer" : "default", marginTop:10 }}>
              Quote
            </button>
          </div>
          <button onClick={onClose} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 0", color:C.muted, fontSize:16, marginTop:4 }}>Cancel</button>
        </>
      )}
    </Sheet>
  );
}

// ── Reply Sheet ────────────────────────────────────────────────────────────
export function ReplySheet({ show, onClose, onModalOpen, onModalClose, showReply, replyText, setReplyText, onSendReply }) {
  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose}>
      {showReply && (
        <>
          <h3 style={{ color:C.text, fontWeight:700, fontSize:16, margin:"0 0 10px" }}>Reply to @{showReply.authorHandle}</h3>
          {showReply.text && (
            <p style={{ color:C.muted, fontSize:14, margin:"0 0 12px", lineHeight:1.4, borderLeft:`3px solid ${C.border}`, paddingLeft:10 }}>
              {showReply.text.slice(0,100)}{showReply.text.length>100?"…":""}
            </p>
          )}
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
            placeholder="Write your reply…" rows={4}
            style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:12, color:C.text, fontSize:15, resize:"none", outline:"none", boxSizing:"border-box" }}
          />
          <button onClick={onSendReply} style={{ width:"100%", background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, border:"none", borderRadius:24, padding:"14px 0", color:"#000", fontWeight:800, fontSize:16, cursor:"pointer", marginTop:14 }}>
            Reply
          </button>
        </>
      )}
    </Sheet>
  );
}
