import {
  C,
  IcoHome,
  IcoVideo,
  IcoSearch,
  IcoMail,
  IcoBell,
  IcoProfile,
  IcoSettings,
} from "../theme.js";
import EchoLogo from "./EchoLogo.jsx";

// ── Icons for Marketplace, Groups & Calls ──────────────────────────────────
const IcoMarketplace = ({ on }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? C.text : "none"} stroke={on ? C.text : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
  </svg>
);

const IcoGroups = ({ on }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? C.text : "none"} stroke={on ? C.text : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IcoPhone = ({ on }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? C.text : "none"} stroke={on ? C.text : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>
);

// ── Tab order: top→bottom ─────────────────────────────────────────────
const TABS = [
  { id: "settings",      Icon: IcoSettings,     label: "Settings" },
  { id: "profile",       Icon: IcoProfile,      label: "Profile" },
  { id: "search",        Icon: IcoSearch,       label: "Search" },
  { id: "marketplace",   Icon: IcoMarketplace,  label: "Marketplace" },
  { id: "groups",        Icon: IcoGroups,       label: "Groups" },
  { id: "inbox",         Icon: IcoMail,         label: "DMs" },
  { id: "calls",         Icon: IcoPhone,        label: "Calls" },
  { id: "notifications", Icon: IcoBell,         label: "Alerts" },
  { id: "videos",        Icon: IcoVideo,        label: "Videos" },
  { id: "home",          Icon: IcoHome,         label: "Home" },
];

export default function SideNav({ active, setActive, show, nodeConnected, connectionMode, onConnClick }) {
  // connectionMode: "node" | "mothership" | "offline"
  const dotColor = connectionMode === "mothership" ? "#D4AF37" : nodeConnected ? "#00ba7c" : "#f4212e";

  return (
    <nav
      style={{
        width: 40,
        minWidth: 40,
        height: "100%",
        background: C.bg,
        borderLeft: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "env(safe-area-inset-top)",
        boxSizing: "border-box",
        overflow: "hidden",
        transform: show ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease",
        position: "relative",
        zIndex: 20,
      }}
    >
      {/* ── Logo at top ── */}
      <div
        style={{
          width: "100%",
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <EchoLogo size={22} />
      </div>

      {/* ── Navigation items — evenly spaced top to bottom ── */}
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          padding: "4px 0",
        }}
      >
        {/* Connection status dot — same size as nav tabs, above settings */}
        <button
          onClick={onConnClick}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            WebkitTapHighlightColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Connection status"
        >
          <div style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
            transition: "box-shadow 0.3s ease",
          }} />
        </button>

        {TABS.map(({ id, Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              title={label}
              aria-label={label}
              style={{
                width: 32,
                height: 32,
                background: isActive ? C.surface : "none",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "background 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Active indicator bar on right edge */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    right: -1,
                    top: 8,
                    bottom: 8,
                    width: 2.5,
                    borderRadius: "3px 0 0 3px",
                    background: C.accent,
                  }}
                />
              )}
              <div style={{ opacity: isActive ? 1 : 0.4, transition: "opacity .15s" }}>
                <Icon on={isActive} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom safe-area spacer */}
      <div style={{ height: "env(safe-area-inset-bottom)", flexShrink: 0 }} />
    </nav>
  );
}
