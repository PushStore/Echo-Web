// File: src/screens/InboxScreen.jsx
import { useState, useEffect, useCallback } from "react";
import { C } from "../theme.js";
import UserPicker from "../components/UserPicker.jsx";
import ConversationList from "../components/dm/ConversationList.jsx";
import ChatView from "../components/dm/ChatView.jsx";
import motherShip from "../mothership.js";

export default function InboxScreen({ p2p }) {
  const [conversations,  setConversations]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedConv,   setSelectedConv]   = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  const [selectMode,      setSelectMode]      = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState(new Set());
  const [showConfirm,     setShowConfirm]     = useState(false);

  // ── Load conversations ────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const result = await p2p.getConversations();
      setConversations(result.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [p2p]);

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, 10000);
    return () => clearInterval(id);
  }, [loadConversations]);

  // Listen for real-time DM push from native layer
  useEffect(() => {
    const handler = () => loadConversations();
    window.addEventListener("echo:dmReceived", handler);
    return () => window.removeEventListener("echo:dmReceived", handler);
  }, [loadConversations]);

  // Listen for Mother Ship DM events via Capacitor plugin listener
  useEffect(() => {
    console.log('[MotherShip] InboxScreen: registering DM listener');
    const handle = motherShip.addDmListener((event) => {
      console.log('[MotherShip] DM received in InboxScreen:', event);
      // Refresh conversation list when a Mother Ship DM arrives
      loadConversations();
      // Also dispatch the existing window event so ChatView picks it up
      if (event?.conversationId) {
        window.dispatchEvent(new CustomEvent("echo:dmReceived", {
          detail: { conversationId: event.conversationId }
        }));
      }
    });
    return () => {
      handle?.remove?.();
    };
  }, [loadConversations]);

  // ── Select mode ───────────────────────────────────────────────
  const toggleConvSelect = (id) => {
    setSelectedConvIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedConvIds(new Set()); };
  const selectAll = () => setSelectedConvIds(new Set(conversations.map(c => c.conversationId)));

  const confirmDelete = async () => {
    try {
      for (const convId of selectedConvIds) {
        const r = await p2p.getMessages({ conversationId: convId, limit: 1000 });
        for (const msg of (r.messages || [])) await p2p.deleteMessage({ messageId: msg.id });
        if (p2p.deleteConversation) await p2p.deleteConversation({ conversationId: convId });
      }
    } catch (err) { alert("Delete failed: " + err.message); }
    finally { setShowConfirm(false); exitSelectMode(); await loadConversations(); }
  };

  // ── Start new conversation via UserPicker ─────────────────────
  const handleSelectUser = async (user) => {
    setShowUserPicker(false);
    try {
      // Check if conversation already exists
      const existing = conversations.find(c => c.otherUserId === user.userId);
      if (existing) {
        // FIX: merge UserPicker's displayName into the conversation object
        // using the correct field name that ChatView reads (otherUserName)
        setSelectedConv({
          ...existing,
          otherUserName:        user.displayName || existing.otherUserName || "",
          otherUserHandle:      user.handle      || existing.otherUserHandle || "",
          otherUserDisplayName: user.displayName || "",   // legacy compat
        });
        return;
      }
      // New conversation — send greeting to create it
      await p2p.sendMessage({ recipientId: user.userId, text: "👋 Hey!" });
      await loadConversations();
      const fresh = await p2p.getConversations();
      const conv  = (fresh.conversations || []).find(c => c.otherUserId === user.userId);
      if (conv) {
        setSelectedConv({
          ...conv,
          otherUserName:        user.displayName || conv.otherUserName || "",
          otherUserHandle:      user.handle      || conv.otherUserHandle || "",
          otherUserDisplayName: user.displayName || "",
        });
      }
    } catch (err) { alert("Failed to start conversation: " + err.message); }
  };

  // ── Chat view ─────────────────────────────────────────────────
  if (selectedConv) {
    return (
      <ChatView
        conversation={selectedConv}
        onBack={() => { setSelectedConv(null); loadConversations(); }}
        p2p={p2p}
      />
    );
  }

  // ── Inbox view ────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
      <ConversationList
        conversations={conversations}
        loading={loading}
        selectMode={selectMode}
        selectedConvIds={selectedConvIds}
        onSelect={(conv) => {
          if (selectMode) { toggleConvSelect(conv.conversationId); return; }
          setSelectedConv(conv);
        }}
        onLongPress={(id) => { setSelectMode(true); setSelectedConvIds(new Set([id])); }}
        onSelectAll={selectAll}
        onExitSelect={exitSelectMode}
        onNewChat={() => setShowUserPicker(true)}
        onDeleteSelected={() => setShowConfirm(true)}
        p2p={p2p}
      />

      {/* Confirm delete */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#111", borderRadius: 20, padding: 24, maxWidth: 300, width: "100%", textAlign: "center" }}>
            <h3 style={{ color: C.text, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Delete {selectedConvIds.size} conversation{selectedConvIds.size !== 1 ? "s" : ""}?
            </h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
              Removes messages from your device only.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, background: "#1a1a1a", color: C.text, border: "none", borderRadius: 12, padding: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmDelete} style={{ flex: 1, background: "#ff3b30", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showUserPicker && (
        <UserPicker onSelectUser={handleSelectUser} onClose={() => setShowUserPicker(false)} />
      )}

      {/* FAB — New DM */}
      <button onClick={() => setShowUserPicker(true)} style={{
        position: "fixed",
        bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 56px)",
        right: 58, width: 56, height: 56, borderRadius: "50%",
        background: "#D4AF37",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,.25)",
        zIndex: 30, WebkitTapHighlightColor: "transparent",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
    </div>
  );
}
