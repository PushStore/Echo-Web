import { useState, useEffect } from "react";
import { C } from "../theme.js";
import { BleMesh } from "../ble.js";
import EchoNodeSettings from "../components/EchoNodeSettings.jsx";
import Sheet from "../components/Sheet.jsx";
import StorageSelectionScreen from "./StorageSelectionScreen.jsx";

// ── BLE Settings Component ─────────────────────────────────────────────
function BleSettings() {
  const [bleAvailable, setBleAvailable] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [meshStatus, setMeshStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    BleMesh.checkBleAvailability?.().then(result => {
      setBleAvailable(result?.available || false);
    }).catch(() => {
      setBleAvailable(false);
    });
  }, []);

  const handleStartScan = async () => {
    setError("");
    try {
      const result = await BleMesh.startScan();
      setScanning(result?.scanning || true);
    } catch (e) {
      setError(e.message || "Failed to start BLE scan");
    }
  };

  const handleStopScan = async () => {
    try {
      await BleMesh.stopScan();
      setScanning(false);
      // Refresh mesh status after stopping
      const status = await BleMesh.getMeshStatus();
      setMeshStatus(status);
    } catch (e) {
      setError(e.message || "Failed to stop BLE scan");
    }
  };

  const refreshStatus = async () => {
    try {
      const status = await BleMesh.getMeshStatus();
      setMeshStatus(status);
    } catch (_) {}
  };

  useEffect(() => {
    if (scanning) {
      const interval = setInterval(refreshStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [scanning]);

  const statusText = bleAvailable === null
    ? "Checking…"
    : bleAvailable
      ? scanning
        ? "Scanning…"
        : meshStatus
          ? `${meshStatus.discoveredCount || 0} peers found`
          : "Available"
      : "Unavailable";

  const dotColor = bleAvailable === null ? C.muted : bleAvailable ? (scanning ? "#f59e0b" : C.green) : C.danger;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
        <span style={{ color: bleAvailable ? C.text : C.muted, fontSize: 14, fontWeight: 600 }}>
          BLE Mesh {statusText}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {scanning ? (
          <button onClick={handleStopScan} disabled={!scanning}
            style={{ background: "none", border: `1px solid ${C.danger}`, borderRadius: 8, padding: "10px 16px", color: C.danger, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            Stop Scan
          </button>
        ) : (
          <button onClick={handleStartScan} disabled={!bleAvailable}
            style={{ background: `linear-gradient(90deg,${C.accentDark},${C.accent})`, border: "none", borderRadius: 8, padding: "10px 16px", color: "#000", fontWeight: 700, fontSize: 13, cursor: bleAvailable ? "pointer" : "default", whiteSpace: "nowrap", flexShrink: 0, opacity: bleAvailable ? 1 : 0.5 }}>
            Start Scan
          </button>
        )}
      </div>
      {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {meshStatus && (
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
          Connected: {meshStatus.connectedCount || 0} · Discovered: {meshStatus.discoveredCount || 0}
        </div>
      )}
      <p style={{ color: C.muted, fontSize: 11, margin: "8px 0 0", lineHeight: 1.5 }}>
        BLE is used to discover nearby Echo users and nodes. This is an emergency/doomsday function.
      </p>
    </div>
  );
}

// ── Settings row helper ────────────────────────────────────────────────────
function SettingsRow({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {icon}
      <div style={{ textAlign: "left" }}>
        <div style={{ color: C.text, fontSize: 16 }}>{title}</div>
        {subtitle && <div style={{ color: C.muted, fontSize: 12 }}>{subtitle}</div>}
      </div>
    </button>
  );
}

// ── Main Settings Screen ───────────────────────────────────────────────────
export default function SettingsScreen({ me, p2p, onLogout, onUpdateProfile, onGoToProfile, onBack, onModalOpen, onModalClose }) {
  const [showAccount, setShowAccount] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", bio: "", avatar: null, banner: null });
  const [avatarPrev, setAvatarPrev] = useState(null);
  const [bannerPrev, setBannerPrev] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [currentStorageType, setCurrentStorageType] = useState("p2p");

  // Open edit form pre-filled
  const openEditProfile = () => {
    setEditForm({ name: me?.name || "", bio: me?.bio || "", avatar: null, banner: null });
    setAvatarPrev(null);
    setBannerPrev(null);
    setShowEdit(true);
  };

  // Save profile
  const saveProfile = async () => {
    if (!p2p) return;
    setSaving(true);
    try {
      const updates = { name: editForm.name, bio: editForm.bio };
      if (editForm.avatar) updates.avatar = editForm.avatar;
      if (editForm.banner) updates.banner = editForm.banner;
      await p2p.updateProfile(updates);
      onUpdateProfile?.(updates);
      setShowEdit(false);
      setAvatarPrev(null);
      setBannerPrev(null);
    } catch (e) {
      console.error("Failed to save profile:", e);
    }
    setSaving(false);
  };

  // Pick image helper
  const pickImage = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl, source: CameraSource.Photos,
        quality: 70, allowEditing: false,
      });
      return photo.dataUrl;
    } catch {
      return new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = e => {
          const file = e.target.files[0]; if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
  };

  // Fetch storage preference on mount
  useEffect(() => {
    if (p2p) {
      p2p.getStoragePreference?.().then(pref => {
        if (pref?.storageType) setCurrentStorageType(pref.storageType)
      }).catch(() => {})
    }
  }, [p2p])

  // Listen for external "open settings" events
  useEffect(() => {
    return () => {};
  }, []);

  const handleDeleteAccount = async () => {
    if (!p2p) return;
    try {
      await p2p.deleteAccount?.();
      onLogout?.();
    } catch (e) {
      console.error("Delete account failed:", e);
    }
  };

  return (
    <div style={{ padding: "16px 16px 0", height: "100%", overflowY: "auto", boxSizing: "border-box" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.text, fontSize: 22, padding: "4px 2px",
            WebkitTapHighlightColor: "transparent",
          }}>←</button>
        )}
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.accentDark}, ${C.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </div>
        <div>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>Settings</div>
          <div style={{ color: C.muted, fontSize: 13 }}>{me?.handle ? `@${me.handle}` : ""}</div>
        </div>
      </div>

      {/* ── Profile Section ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 4 }}>
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "8px 0 6px" }}>PROFILE</div>

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          title="Edit profile"
          subtitle="Name, bio, avatar, banner"
          onClick={openEditProfile}
        />

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          title="View profile"
          subtitle="See your profile as others see it"
          onClick={() => onGoToProfile?.()}
        />
      </div>

      {/* ── Account Section ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 4 }}>
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "8px 0 6px" }}>ACCOUNT</div>

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>}
          title="Media Storage"
          subtitle={currentStorageType === "p2p" ? "P2P Direct Seeding" : currentStorageType === "gdrive" ? "Google Drive (encrypted)" : currentStorageType === "web3" ? "Web3 / IPFS (encrypted)" : "Not configured"}
          onClick={() => setShowStorage(true)}
        />

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          title="Account settings"
          subtitle="Log out, delete account"
          onClick={() => setShowAccount(true)}
        />

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          title="Backup & Restore"
          subtitle="Export and import your data"
          onClick={() => {}}
        />

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
          title="Device Management"
          subtitle="Manage linked devices"
          onClick={() => {}}
        />

        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          title="Identity Verification"
          subtitle="Verify your identity for trust"
          onClick={() => {}}
        />
      </div>

      {/* ── Echo Node Section ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 4 }}>
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "8px 0 4px" }}>ECHO NODE</div>
        <EchoNodeSettings p2p={p2p} />
      </div>

      {/* ── Connectivity Section (BLE) ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 4 }}>
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "8px 0 4px" }}>CONNECTIVITY</div>
        <BleSettings />
      </div>

      {/* ── Appearance Section ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 4 }}>
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "8px 0 6px" }}>APPEARANCE</div>
        <SettingsRow
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
          title="Dark mode"
          subtitle="On"
          onClick={() => {}}
        />
      </div>

      {/* ── Spacer for scrollable content ── */}
      <div style={{ height: 40 }} />

      {/* ════════════ ACCOUNT SETTINGS SHEET ════════════ */}
      <Sheet show={showAccount} onClose={() => setShowAccount(false)} title="Account settings" showClose>
        <button onClick={() => { setShowAccount(false); onLogout?.(); }}
          style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 0", color: C.text, fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 12 }}>
          Log out
        </button>
        <button onClick={async () => { setShowAccount(false); await handleDeleteAccount(); }}
          style={{ width: "100%", background: "none", border: `1px solid ${C.danger}`, borderRadius: 12, padding: "14px 0", color: C.danger, fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 8 }}>
          Delete account
        </button>
        <p style={{ color: C.muted, fontSize: 12, textAlign: "center", margin: "0 0 16px" }}>Deleting your account is permanent and cannot be undone.</p>
        <button onClick={() => setShowAccount(false)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "10px 0", color: C.muted, fontSize: 16 }}>Cancel</button>
      </Sheet>

      {/* ════════════ EDIT PROFILE SHEET ════════════ */}
      <Sheet show={showEdit} onClose={() => setShowEdit(false)} title="Edit profile" showClose>
        {/* Banner */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Banner image</div>
          <div onClick={async () => { const img = await pickImage(); if (img) { setBannerPrev(img); setEditForm(f => ({ ...f, banner: img })); } }}
            style={{ height: 90, borderRadius: 10, border: `2px dashed ${C.border}`, background: bannerPrev || me?.banner ? `url(${bannerPrev || me.banner}) center/cover` : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {!bannerPrev && !me?.banner && <span style={{ color: C.muted, fontSize: 13 }}>Tap to set banner</span>}
          </div>
        </div>
        {/* Avatar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Profile photo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: avatarPrev || me?.avatar
                  ? `url(${avatarPrev || me.avatar}) center/cover`
                  : `linear-gradient(135deg, ${C.accentDark}, ${C.accent})`,
                border: `2px solid ${C.border}`,
              }}
            />
            <button onClick={async () => { const img = await pickImage(); if (img) { setAvatarPrev(img); setEditForm(f => ({ ...f, avatar: img })); } }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 18px", color: C.text, fontSize: 14, cursor: "pointer" }}>
              Change photo
            </button>
          </div>
        </div>
        {/* Name */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "18px 14px 8px", marginBottom: 12, position: "relative" }}>
          <span style={{ position: "absolute", top: 6, left: 14, color: C.muted, fontSize: 11 }}>Name</span>
          <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 16, padding: 0, boxSizing: "border-box" }} />
        </div>
        {/* Bio */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "18px 14px 8px", marginBottom: 20, position: "relative" }}>
          <span style={{ position: "absolute", top: 6, left: 14, color: C.muted, fontSize: 11 }}>Bio</span>
          <input value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
            style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 16, padding: 0, boxSizing: "border-box" }} />
        </div>
        <button onClick={saveProfile} disabled={saving} style={{ width: "100%", background: `linear-gradient(90deg,${C.accentDark},${C.accent})`, border: "none", borderRadius: 24, padding: "14px 0", color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </Sheet>

      {/* ════════════ STORAGE SELECTION OVERLAY ════════════ */}
      {showStorage && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:C.bg, overflowY:"auto", WebkitOverflowScrolling:"touch",
          paddingTop:"max(0, env(safe-area-inset-top))", paddingBottom:"max(0, env(safe-area-inset-bottom))" }}>
          <StorageSelectionScreen
            onComplete={(storageType) => {
              setCurrentStorageType(storageType)
              setShowStorage(false)
            }}
            onBack={() => setShowStorage(false)}
            showContinue={false}
            currentStorage={currentStorageType}
            p2p={p2p}
          />
        </div>
      )}
    </div>
  );
}
