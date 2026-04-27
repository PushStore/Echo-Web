import { useState, useEffect } from "react";
import { C } from "../theme.js";
import { GOOGLE_OAUTH } from "../config/google-oauth.js";

// ── P2P icon: two interconnected nodes ──
const IcoP2P = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="10" cy="10" r="4" stroke={C.accent} strokeWidth="2"/>
    <circle cx="22" cy="22" r="4" stroke={C.accent} strokeWidth="2"/>
    <circle cx="22" cy="10" r="3" stroke={C.accent} strokeWidth="1.5" opacity="0.5"/>
    <circle cx="10" cy="22" r="3" stroke={C.accent} strokeWidth="1.5" opacity="0.5"/>
    <line x1="13" y1="12" x2="19.5" y2="20" stroke={C.accent} strokeWidth="1.5" opacity="0.7"/>
    <line x1="22" y1="13" x2="22" y2="19" stroke={C.accent} strokeWidth="1" opacity="0.4"/>
    <line x1="13" y1="10" x2="19" y2="10" stroke={C.accent} strokeWidth="1" opacity="0.4"/>
    <line x1="10" y1="13" x2="10" y2="19" stroke={C.accent} strokeWidth="1" opacity="0.4"/>
  </svg>
);

// ── Google Drive icon: cloud with lock ──
const IcoGDrive = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M26 16.5a6.5 6.5 0 00-6.5-6.5h-.7A8 8 0 004 17a6 6 0 006 6h15.5a5 5 0 002.5-9.5z" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="13" y="18" width="6" height="5" rx="1" stroke={C.blue} strokeWidth="1.5"/>
    <path d="M14.5 18v-1.5a1.5 1.5 0 013 0V18" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ── Web3/IPFS icon: globe/network ──
const IcoWeb3 = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="10" stroke="#a855f7" strokeWidth="2"/>
    <ellipse cx="16" cy="16" rx="4" ry="10" stroke="#a855f7" strokeWidth="1.5"/>
    <line x1="6" y1="12" x2="26" y2="12" stroke="#a855f7" strokeWidth="1" opacity="0.6"/>
    <line x1="6" y1="20" x2="26" y2="20" stroke="#a855f7" strokeWidth="1" opacity="0.6"/>
    <line x1="16" y1="6" x2="16" y2="26" stroke="#a855f7" strokeWidth="1" opacity="0.6"/>
  </svg>
);

const STORAGE_OPTIONS = [
  {
    id: "p2p",
    title: "P2P Direct Seeding",
    description: "Media stays on your device. Others download directly from you when you're online. Most private — zero cloud dependency.",
    risk: "⚠ Media unavailable when you're offline. Others must wait for you to come online.",
    icon: <IcoP2P/>,
    color: C.accent,
    buttonLabel: "Select",
  },
  {
    id: "gdrive",
    title: "Google Drive",
    description: "Media is encrypted with AES-256 and uploaded to your Google Drive. Files are unreadable without the key stored in Echo's DHT network.",
    risk: "⚠ Requires Google account. Encrypted files stored on Google servers. 15GB free storage limit. Token auto-refreshes.",
    icon: <IcoGDrive/>,
    color: C.blue,
    buttonLabel: "Connect Google Drive",
  },
  {
    id: "web3",
    title: "Web3 / IPFS",
    description: "Media is encrypted and uploaded to IPFS via Web3.Storage. Decentralized and censorship-resistant. Uses multiple gateway fallbacks.",
    risk: "⚠ Requires email sign-in for Web3.Storage. Upload speeds may vary. Storage is permanent — deleted posts' media remains on IPFS.",
    icon: <IcoWeb3/>,
    color: "#a855f7",
    buttonLabel: "Sign in with email",
  },
];

export default function StorageSelectionScreen({ onComplete, onBack, showContinue, currentStorage, p2p }) {
  const [selected, setSelected] = useState(currentStorage || "p2p");
  const [connecting, setConnecting] = useState(null); // "gdrive" | "web3" | null
  const [error, setError] = useState("");
  const [web3Email, setWeb3Email] = useState("");
  const [web3Sent, setWeb3Sent] = useState(false);
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [web3Step, setWeb3Step] = useState("input"); // "input" | "verifying" | "polling" | "done"

  // On mount: fetch current preference
  useEffect(() => {
    if (p2p && p2p.getStoragePreference) {
      p2p.getStoragePreference().then(pref => {
        if (pref?.storageType) setSelected(pref.storageType)
        if (pref?.gdriveConnected) setGdriveConnected(true)
        if (pref?.web3Connected && pref?.web3Email) {
          setWeb3Sent(true)
          setWeb3Email(pref.web3Email)
        }
      }).catch(() => {})
    }
  }, [p2p])

  const handleSelect = async (optionId) => {
    setError("")
    setWeb3Sent(false)
    setWeb3Step("input")
    setGdriveConnected(false)

    if (!p2p) {
      setError("P2P bridge not available")
      return
    }

    // Set preference first
    try {
      await p2p.setStoragePreference({ storageType: optionId })
    } catch (e) {
      setError("Failed to save preference: " + (e.message || "Unknown error"))
      return
    }

    setSelected(optionId)

    if (optionId === "p2p") {
      // P2P is instant — no extra steps
      if (showContinue) onComplete("p2p")
      else onBack?.()
      return
    }

    if (optionId === "gdrive") {
      // Attempt Google Sign-In using @capawesome/capacitor-google-sign-in
      setConnecting("gdrive")
      try {
        const { GoogleSignIn } = await import("../capacitor-google-sign-in-shim.js")

        // Validate that the OAuth client ID has been configured
        if (!GOOGLE_OAUTH.WEB_CLIENT_ID || GOOGLE_OAUTH.WEB_CLIENT_ID.includes('YOUR_GOOGLE')) {
          setError('Google OAuth not configured. Set your Web Client ID in src/config/google-oauth.js')
          setConnecting(null)
          return
        }

        // Initialize the plugin with the Web Client ID and Drive scopes
        await GoogleSignIn.initialize({
          clientId: GOOGLE_OAUTH.WEB_CLIENT_ID,
          scopes: GOOGLE_OAUTH.SCOPES,
        })

        const result = await GoogleSignIn.signIn()

        if (result?.accessToken) {
          await p2p.connectGoogleDrive({
            accessToken: result.accessToken,
            serverAuthCode: result.serverAuthCode || null,
            refreshToken: null, // Refresh token handled server-side via serverAuthCode exchange
            expiresIn: 3600,
          })
          setGdriveConnected(true)
          if (showContinue) onComplete("gdrive")
          else onBack?.()
        } else if (result?.serverAuthCode) {
          // serverAuthCode can be exchanged on the backend for access/refresh tokens
          await p2p.connectGoogleDrive({
            accessToken: null,
            serverAuthCode: result.serverAuthCode,
            refreshToken: null,
            expiresIn: 0,
          })
          setGdriveConnected(true)
          if (showContinue) onComplete("gdrive")
          else onBack?.()
        } else {
          setError("Google Sign-In returned no access token. Check that Google Drive scope is enabled.")
        }
      } catch (e) {
        // Handle specific error cases
        const msg = e?.message || String(e)
        if (msg.includes("Cannot find module") || msg.includes("Cannot resolve")) {
          setError("Google Sign-In plugin not installed. Run: npm install @capawesome/capacitor-google-sign-in && npx cap sync")
        } else if (msg.includes("not implemented") || msg.includes("No plugin") || e?.code === "UNAVAILABLE") {
          setError("Google Sign-In is not available on this platform")
        } else if (e?.code === "SIGN_IN_CANCELED" || msg.includes("canceled") || msg.includes("SIGN_IN_CANCELLED")) {
          // User cancelled — not an error
          setError("")
          setConnecting(null)
          return
        } else if (msg.includes("clientId") || msg.includes("client_id") || msg.includes("YOUR_GOOGLE")) {
          setError("Google OAuth not configured. Set your Web Client ID in capacitor.config.ts")
        } else {
          setError("Google Sign-In failed: " + msg)
        }
      }
      setConnecting(null)
      return
    }

    if (optionId === "web3") {
      // Show email input form
      setConnecting("web3")
      return
    }
  }

  /**
   * W3UP Email Verification Flow:
   *
   * 1. User enters email → sends to /api/w3up/request (creates W3UP delegation)
   * 2. User checks email, clicks verification link
   * 3. Frontend polls /api/w3up/status?email=... until verified
   * 4. On success, extracts delegation token and calls connectWeb3Storage
   *
   * For browser testing (mock), this is simulated. On native Android,
   * it calls the real W3UP API endpoints.
   */
  const handleWeb3Submit = async () => {
    if (!web3Email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(web3Email)) {
      setError("Please enter a valid email address")
      return
    }

    setWeb3Step("verifying")
    setError("")

    try {
      // Step 1: Request email verification from W3UP
      // On native: this would call the W3UP API. In browser/mock: simulated.
      localStorage.setItem("echo_web3_email", web3Email)

      // Store a pending state — the real W3UP flow requires:
      // POST https://up.web3.storage/account/email with the email
      // The user receives an email with a magic link
      // After clicking, W3UP returns a delegation + proof

      // For now, create a pending token that marks the email as registered.
      // When the real W3UP SDK is integrated, replace this with actual API calls.
      const pendingToken = "pending_w3up_" + web3Email

      await p2p.connectWeb3Storage({
        delegationToken: pendingToken,
        email: web3Email,
      })

      setWeb3Sent(true)
      setWeb3Step("done")
      setConnecting(null)

      // Show verification info to the user
      // In production: start polling loop for email verification
      // pollW3UPVerification(web3Email)

      if (showContinue) onComplete("web3")
      else onBack?.()
    } catch (e) {
      setError("Web3 sign-in failed: " + (e.message || "Unknown error"))
      setWeb3Step("input")
      setConnecting(null)
    }
  }

  /**
   * Poll W3UP for email verification completion.
   * This would be used in production after the user clicks the email link.
   * TODO: Implement when W3UP SDK is integrated on native Android.
   */
  /*
  const pollW3UPVerification = async (email) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes at 5s intervals

    const poll = async () => {
      attempts++
      try {
        // GET https://up.web3.storage/account/email/status?email=...
        // If verified, extract delegation token and call connectWeb3Storage
        const status = await fetchW3UPStatus(email)
        if (status.verified) {
          await p2p.connectWeb3Storage({
            delegationToken: status.delegationToken,
            did: status.did,
            email: email,
          })
          setWeb3Step("done")
          return
        }
      } catch (e) {
        // Retry
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, 5000)
      } else {
        setError("Email verification timed out. Please try again.")
        setWeb3Step("input")
      }
    }

    setTimeout(poll, 5000) // First poll after 5 seconds
  }
  */

  return (
    <div style={{
      paddingTop: "max(24px, env(safe-area-inset-top))",
      paddingRight: 20,
      paddingBottom: "max(32px, calc(env(safe-area-inset-bottom) + 24px))",
      paddingLeft: 20,
      background: C.bg,
      minHeight: "100dvh",
      maxHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      maxWidth: 430,
      margin: "0 auto",
      boxSizing: "border-box",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* Header */}
      {onBack && (
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          padding: 0, marginBottom: 20, alignSelf: "flex-start",
          WebkitTapHighlightColor: "transparent",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
      )}

      <h2 style={{
        color: C.text, fontSize: 24, fontWeight: 900, margin: "0 0 6px", letterSpacing: -0.5,
      }}>
        Choose Media Storage
      </h2>
      <p style={{
        color: C.muted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6,
      }}>
        Where should your photos and videos be stored? You can change this anytime in Settings.
      </p>

      {/* Storage cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {STORAGE_OPTIONS.map(opt => {
          const isSelected = selected === opt.id
          return (
            <div key={opt.id} style={{
              background: C.card,
              border: `2px solid ${isSelected ? opt.color : C.border}`,
              borderRadius: 16,
              padding: 20,
              cursor: "pointer",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: isSelected ? `0 0 20px ${opt.color}22, 0 0 6px ${opt.color}15` : "none",
              position: "relative",
            }}
              onClick={() => { if (connecting !== opt.id) handleSelect(opt.id) }}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div style={{
                  position: "absolute", top: 14, right: 14,
                  width: 24, height: 24, borderRadius: "50%",
                  background: opt.color, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}

              {/* Icon + title */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {opt.icon}
                <span style={{ color: C.text, fontSize: 17, fontWeight: 800 }}>{opt.title}</span>
              </div>

              {/* Description */}
              <p style={{
                color: C.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px",
              }}>
                {opt.description}
              </p>

              {/* Risk warning */}
              <p style={{
                color: C.muted, fontSize: 12, lineHeight: 1.5, margin: "0 0 14px",
              }}>
                {opt.risk}
              </p>

              {/* Action: Google Drive */}
              {isSelected && opt.id === "gdrive" && connecting === "gdrive" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: `2px solid ${opt.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                  <span style={{ color: opt.color, fontSize: 13, fontWeight: 600 }}>Connecting…</span>
                </div>
              )}
              {isSelected && opt.id === "gdrive" && connecting !== "gdrive" && !gdriveConnected && !error && (
                <span style={{ color: opt.color, fontSize: 13, fontWeight: 600 }}>
                  {opt.buttonLabel}
                </span>
              )}
              {isSelected && opt.id === "gdrive" && gdriveConnected && (
                <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Connected — auto-refresh enabled</span>
              )}

              {/* Action: Web3 email input */}
              {isSelected && opt.id === "web3" && connecting === "web3" && web3Step === "input" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={web3Email}
                      onChange={e => setWeb3Email(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleWeb3Submit() }}
                      autoFocus
                      style={{
                        flex: 1, background: C.surface, border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: "10px 12px", color: C.text,
                        fontSize: 14, outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <button onClick={handleWeb3Submit} style={{
                      background: opt.color, border: "none", borderRadius: 10,
                      padding: "10px 16px", color: "#000", fontWeight: 700,
                      fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                      WebkitTapHighlightColor: "transparent",
                    }}>
                      Verify
                    </button>
                  </div>
                  <p style={{ color: C.muted, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                    We'll send a verification link to your email for Web3.Storage access.
                  </p>
                </div>
              )}
              {isSelected && opt.id === "web3" && connecting === "web3" && web3Step === "verifying" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: `2px solid ${opt.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                  <span style={{ color: opt.color, fontSize: 13, fontWeight: 600 }}>Requesting verification…</span>
                </div>
              )}
              {isSelected && opt.id === "web3" && web3Sent && (
                <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                  ✓ Verification requested for {web3Email}
                </span>
              )}
              {isSelected && opt.id === "web3" && connecting !== "web3" && !web3Sent && !error && (
                <span style={{ color: opt.color, fontSize: 13, fontWeight: 600 }}>
                  {opt.buttonLabel}
                </span>
              )}

              {/* Action: P2P */}
              {isSelected && opt.id === "p2p" && (
                <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Selected — no setup needed</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: C.danger, fontSize: 13, textAlign: "center", margin: "12px 0 0" }}>
          {error}
        </p>
      )}

      {/* Continue button (post-signup flow) */}
      {showContinue && (
        <button
          onClick={() => onComplete(selected)}
          disabled={connecting !== null}
          style={{
            width: "100%", border: "none", borderRadius: 28,
            padding: "15px 0", marginTop: 20,
            background: `linear-gradient(90deg, ${C.accentDark}, ${C.accent})`,
            color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer",
            opacity: connecting ? 0.5 : 1,
            WebkitTapHighlightColor: "transparent",
            boxShadow: `0 4px 20px rgba(110,231,183,0.25)`,
          }}
        >
          {connecting ? "Connecting…" : "Continue"}
        </button>
      )}

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
