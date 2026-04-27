import { useState, useEffect, useCallback } from "react";
import { C } from "./theme.js";
import { p2pBridge } from "./p2p-bridge.js";

// Hooks
import { useConnectionStatus } from "./hooks/useConnectionStatus.js";
import { useMothership } from "./hooks/useMothership.js";
import { useBackButton } from "./hooks/useBackButton.js";
import { useFeedCache } from "./hooks/useFeedCache.js";

// Screens
import AuthScreen           from "./screens/AuthScreen.jsx";
import HomeFeed             from "./screens/HomeFeed.jsx";
import VideosFeed           from "./screens/VideosFeed.jsx";
import SearchScreen         from "./screens/SearchScreen.jsx";
import InboxScreen          from "./screens/InboxScreen.jsx";
import NotificationsScreen  from "./screens/NotificationsScreen.jsx";
import ProfileScreen        from "./screens/ProfileScreen.jsx";
import ComposeModal         from "./screens/ComposeModal.jsx";
import MarketplaceScreen    from "./screens/MarketplaceScreen.jsx";
import MarketplacePublish   from "./screens/MarketplacePublish.jsx";
import GroupListScreen      from "./screens/GroupListScreen.jsx";
import CallsScreen          from "./screens/CallsScreen.jsx";
import SettingsScreen        from "./screens/SettingsScreen.jsx";

// Components
import SideNav                  from "./components/SideNav.jsx";
import ConnectionStatusPanel    from "./components/ConnectionStatusPanel.jsx";
import IcoPencil                from "./components/IcoPencil.jsx";

export default function App() {
  const [me,             setMe]             = useState(null);
  const [tab,            setTab]            = useState("home");
  const [composing,      setComposing]      = useState(false);
  const [showMarketplacePublish, setShowMarketplacePublish] = useState(false);
  const [showNav]                            = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [following,      setFollowing]      = useState([]);
  const [exitPrompt,     setExitPrompt]     = useState(false);
  const [showConnPanel,  setShowConnPanel]  = useState(false);
  const [wantsSettings,  setWantsSettings]  = useState(false);

  // ── Custom hooks ───────────────────────────────────────────────────────────
  const { posts, setPosts, clearFeedCache, clearVideoCache } = useFeedCache(me);
  const { nodeConnected, nodeStatus } = useConnectionStatus(me);
  const {
    mothershipConnected, mothershipStatus,
    handleDisconnectMothership, disconnectOnLogout,
  } = useMothership(me, nodeConnected);

  const { pushModal, popModal, switchTab, handleUserClick, navStack, modalStack } = useBackButton({
    tab, setTab, viewingProfile, setViewingProfile,
    composing, setComposing, exitPrompt, setExitPrompt,
  });

  // ── Mother Ship fallback when node fails all reconnect attempts ────────────
  useEffect(() => {
    if (!me || nodeConnected) return;
    // Polling is handled by useConnectionStatus; this effect watches for
    // persistent disconnection to trigger Mother Ship fallback once.
    // (The auto-reconnect logic lives inside useConnectionStatus.)
  }, [me, nodeConnected]);

  // Handle "Go to Settings" from connection panel
  useEffect(() => {
    if (wantsSettings) {
      setWantsSettings(false);
      switchTab("settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsSettings]);

  const handleFollow = async (userId) => {
    try {
      await p2pBridge?.followUser({ userId });
      setFollowing(prev => [...prev, userId]);
    } catch(_) {}
  };

  const handleLogout = () => {
    disconnectOnLogout();
    setMe(null);
    setTab("home");
    setComposing(false);
    setViewingProfile(null);
    navStack.current   = [];
    modalStack.current = [];
    clearVideoCache();
    clearFeedCache();
  };

  const handleUpdateProfile = useCallback((updates) => {
    setMe(prev => ({ ...prev, ...updates }));
  }, []);

  // Derive overall connection state for UI
  const isOnline = nodeConnected || mothershipConnected;
  const connectionMode = nodeConnected ? "node" : mothershipConnected ? "mothership" : "offline";

  const shell = {
    maxWidth:480, margin:"0 auto", height:"100dvh",
    display:"flex", flexDirection:"row",
    background:C.bg,
    fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflow:"hidden", position:"relative",
    boxSizing:"border-box",
  };

  const handleGoToProfile = useCallback(() => {
    switchTab("profile");
  }, [switchTab]);

  if (!me) return (
    <div style={{...shell, flexDirection:"column", maxWidth:430}}><AuthScreen onLogin={setMe}/></div>
  );

  const showFAB = tab !== "inbox" && tab !== "groups" && tab !== "calls" && tab !== "marketplace" && tab !== "settings" && !composing;

  return (
    <div style={shell}>
      {/* ── Main content area ── */}
      <div style={{ flex:1, height:"100%", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        {showConnPanel && (
          <ConnectionStatusPanel
            status={nodeStatus}
            mothershipStatus={mothershipStatus}
            onClose={() => setShowConnPanel(false)}
            onGoToSettings={() => setWantsSettings(true)}
            onDisconnectMothership={handleDisconnectMothership}
          />
        )}

        {/* Tab content — home/search/profile stay mounted (display toggle) for caching;
            other tabs render on demand to avoid WebView memory issues */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", paddingTop:"env(safe-area-inset-top)", paddingBottom:"env(safe-area-inset-bottom)" }}>
          <div style={{ display: tab==="home" ? "flex" : "none", flex:1, flexDirection:"column", overflow:"hidden" }}>
            <HomeFeed posts={posts} setPosts={setPosts} me={me} onAvatarClick={() => switchTab("profile")} p2p={p2pBridge}/>
          </div>
          <div style={{ display: tab==="videos" ? "flex" : "none", flex:1, flexDirection:"column", overflow:"hidden" }}>
            <VideosFeed p2p={p2pBridge} me={me} onCompose={() => setComposing(true)} isActive={tab==="videos"}/>
          </div>
          <div style={{ display: tab==="search" ? "flex" : "none", flex:1, flexDirection:"column", overflow:"hidden" }}>
            <SearchScreen p2p={p2pBridge} me={me} following={following} onUserClick={handleUserClick} onFollow={handleFollow}/>
          </div>
          {tab==="inbox"         && <InboxScreen p2p={p2pBridge}/>}
          {tab==="groups"        && <GroupListScreen p2p={p2pBridge} me={me} onAvatarClick={() => switchTab("profile")}/>}
          {tab==="marketplace"   && <MarketplaceScreen p2p={p2pBridge} me={me} onAvatarClick={() => switchTab("profile")} onPublishClick={() => setShowMarketplacePublish(true)}/>}
          {tab==="calls"         && <CallsScreen p2p={p2pBridge} me={me} onAvatarClick={() => switchTab("profile")}/>}
          {tab==="notifications" && <NotificationsScreen/>}
          {tab==="settings"      && (
            <SettingsScreen
              me={me}
              p2p={p2pBridge}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
              onGoToProfile={handleGoToProfile}
              onBack={() => {
                if (navStack.current.length > 0) {
                  const prev = navStack.current.pop();
                  setTab(prev.tab);
                  setViewingProfile(prev.viewingProfile ?? null);
                } else {
                  setTab("home");
                }
              }}
              onModalOpen={pushModal}
              onModalClose={popModal}
            />
          )}
          <div style={{ display: tab==="profile" ? "flex" : "none", flex:1, flexDirection:"column", overflow:"hidden" }}>
            <ProfileScreen
              me={me}
              viewingProfile={viewingProfile}
              onLogout={handleLogout}
              onBack={() => {
                modalStack.current = [];
                if (navStack.current.length > 0) {
                  const prev = navStack.current.pop();
                  setTab(prev.tab);
                  setViewingProfile(prev.viewingProfile ?? null);
                } else {
                  setViewingProfile(null);
                  setTab("home");
                }
              }}
              p2p={p2pBridge}
              onUpdateProfile={handleUpdateProfile}
              onModalOpen={pushModal}
              onModalClose={popModal}
              isActive={tab==="profile"}
            />
          </div>
        </div>

        {/* FAB compose button */}
        {showFAB && (
          <button onClick={() => setComposing(true)} style={{
            position:"fixed",
            bottom:"calc(max(16px, env(safe-area-inset-bottom)) + 56px)",
            right:58, width:56, height:56, borderRadius:"50%",
            background:"#D4AF37",
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 20px rgba(0,0,0,.25)",
            zIndex:30, WebkitTapHighlightColor:"transparent",
          }}>
            <IcoPencil/>
          </button>
        )}
      </div>

      {/* ── Right sidebar navigation ── */}
      <SideNav active={tab} setActive={switchTab} show={showNav || tab==="videos"} nodeConnected={isOnline} connectionMode={connectionMode} onConnClick={() => setShowConnPanel(true)} />

      {/* ── Global overlays ── */}
      {composing && (
        <ComposeModal
          me={me}
          onClose={() => setComposing(false)}
          p2p={p2pBridge}
          onPosted={() => p2pBridge.getFeed().then(r => {
            const newPosts = r.posts || [];
            setPosts(prev => {
              const ids = new Set(prev.map(p => p.id));
              const fresh = newPosts.filter(p => !ids.has(p.id));
              return [...fresh, ...prev].slice(0, 100);
            });
          })}
        />
      )}

      {showMarketplacePublish && (
        <MarketplacePublish
          p2p={p2pBridge}
          onClose={() => setShowMarketplacePublish(false)}
          onPublished={() => setShowMarketplacePublish(false)}
        />
      )}

      {exitPrompt && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setExitPrompt(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:C.card, borderRadius:16, padding:"28px 24px", width:280, textAlign:"center" }}>
            <p style={{ color:C.text, fontSize:17, fontWeight:700, margin:"0 0 8px" }}>Exit Echo?</p>
            <p style={{ color:C.muted, fontSize:14, margin:"0 0 24px" }}>Are you sure you want to exit?</p>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setExitPrompt(false)}
                style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:"12px 0", color:C.text, fontWeight:700, fontSize:15, cursor:"pointer" }}>
                No
              </button>
              <button onClick={async () => {
                setExitPrompt(false);
                try { const { App: CapApp } = await import("@capacitor/app"); await CapApp.exitApp(); }
                catch(_) { window.close(); }
              }} style={{ flex:1, background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, border:"none", borderRadius:24, padding:"12px 0", color:"#000", fontWeight:800, fontSize:15, cursor:"pointer" }}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
