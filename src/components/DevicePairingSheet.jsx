import { useState, useEffect } from "react";
import { C } from "../theme.js";
import Sheet from "./Sheet.jsx";

export default function DevicePairingSheet({ show, onClose, p2p, onModalOpen, onModalClose }) {
  const [tab, setTab] = useState("devices"); // "devices" | "pair"
  const [pairingToken, setPairingToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [deviceName, setDeviceName] = useState("Web Browser");
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (show && tab === "devices") loadDevices();
  }, [show, tab]);

  const loadDevices = async () => {
    if (!p2p) return;
    setLoading(true);
    try {
      const result = await p2p.pairList();
      setDevices(result?.devices || []);
    } catch (e) {
      console.warn("Failed to load paired devices:", e);
      setDevices([]);
    }
    setLoading(false);
  };

  const handleGenerateToken = async () => {
    if (!p2p) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await p2p.pairGenerate({ label: deviceName });
      if (result?.success && result?.token) {
        setPairingToken(result.token);
        setMessage("Token generated. Share this token with the other device.");
      } else {
        setMessage(result?.error || "Failed to generate token");
      }
    } catch (e) {
      setMessage("Error: " + (e.message || "Unknown error"));
    }
    setLoading(false);
  };

  const handleVerifyToken = async () => {
    if (!p2p || !tokenInput.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await p2p.pairVerify({ token: tokenInput.trim(), deviceName });
      if (result?.success) {
        setMessage("Device paired successfully!");
        setTokenInput("");
        setTab("devices");
        loadDevices();
      } else {
        setMessage(result?.error || "Failed to verify token");
      }
    } catch (e) {
      setMessage("Error: " + (e.message || "Unknown error"));
    }
    setLoading(false);
  };

  const handleUnpair = async (pairingId) => {
    if (!p2p) return;
    setLoading(true);
    try {
      const result = await p2p.pairUnpair({ pairingId });
      if (result?.success) {
        loadDevices();
      } else {
        setMessage(result?.error || "Failed to unpair device");
      }
    } catch (e) {
      setMessage("Error: " + (e.message || "Unknown error"));
    }
    setLoading(false);
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose} title="Device Management" showClose>
      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, borderRadius: 10, padding: 3 }}>
        <button
          onClick={() => setTab("devices")}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 14,
            background: tab === "devices" ? C.border : "none",
            color: tab === "devices" ? C.text : C.muted,
            transition: "all .15s",
          }}
        >
          Paired Devices
        </button>
        <button
          onClick={() => { setTab("pair"); setMessage(""); setPairingToken(""); }}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 14,
            background: tab === "pair" ? C.border : "none",
            color: tab === "pair" ? C.text : C.muted,
            transition: "all .15s",
          }}
        >
          Pair Device
        </button>
      </div>

      {/* ── Paired Devices Tab ── */}
      {tab === "devices" && (
        <div>
          {loading && !devices.length ? (
            <div style={{ color: C.muted, textAlign: "center", padding: "32px 0" }}>Loading...</div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              <div style={{ color: C.muted, fontSize: 14 }}>No paired devices</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Pair a device to sync data across devices</div>
            </div>
          ) : (
            <div>
              {devices.map((device) => (
                <div key={device.pairing_id || device.deviceId} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 0", borderBottom: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: C.surface, border: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {device.device_type === "mobile" ? (
                          <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>
                        ) : (
                          <><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>
                        )}
                      </svg>
                    </div>
                    <div>
                      <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{device.device_name || device.name || "Unknown"}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {device.device_type || "web"}{device.last_sync_at ? ` · Last sync: ${formatTime(device.last_sync_at)}` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnpair(device.pairing_id || device.pairingId)}
                    style={{
                      background: "none", border: `1px solid ${C.danger}`, borderRadius: 6,
                      padding: "6px 14px", color: C.danger, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Unpair
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pair Device Tab ── */}
      {tab === "pair" && (
        <div>
          {/* Generate token */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Generate Pairing Token
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              Create a token and share it with the other device to pair.
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Device label"
                style={{
                  flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "10px 12px", color: C.text, fontSize: 14, outline: "none",
                }}
              />
              <button
                onClick={handleGenerateToken}
                disabled={loading}
                style={{
                  background: `linear-gradient(90deg,${C.accentDark},${C.accent})`, border: "none",
                  borderRadius: 8, padding: "10px 18px", color: "#000", fontWeight: 700,
                  fontSize: 13, cursor: loading ? "default" : "pointer", whiteSpace: "nowrap",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Generate
              </button>
            </div>
            {pairingToken && (
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "14px", marginBottom: 8,
              }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>PAIRING TOKEN</div>
                <div style={{
                  color: C.accent, fontSize: 18, fontWeight: 800, fontFamily: "monospace",
                  letterSpacing: 1, wordBreak: "break-all",
                }}>
                  {pairingToken}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                  Share this token with the device you want to pair. It expires in 10 minutes.
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "20px 0" }}>
            <div style={{
              color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px",
              textAlign: "center", margin: "-10px 0 0", background: C.card, display: "inline-block", padding: "0 8px",
              transform: "translateX(50%)",
            }}>
              OR ENTER TOKEN
            </div>
          </div>

          {/* Verify token */}
          <div>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Enter Pairing Token
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              Paste a token from another device to pair this browser.
            </div>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "12px", marginBottom: 12,
            }}>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="pair_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: "100%", background: "none", border: "none", outline: "none",
                  color: C.text, fontSize: 14, fontFamily: "monospace",
                }}
              />
            </div>
            <button
              onClick={handleVerifyToken}
              disabled={loading || !tokenInput.trim()}
              style={{
                width: "100%",
                background: `linear-gradient(90deg,${C.accentDark},${C.accent})`, border: "none",
                borderRadius: 8, padding: "12px 0", color: "#000", fontWeight: 700,
                fontSize: 14, cursor: loading || !tokenInput.trim() ? "default" : "pointer",
                opacity: loading || !tokenInput.trim() ? 0.5 : 1,
              }}
            >
              {loading ? "Pairing..." : "Pair Device"}
            </button>
          </div>

          {/* Status message */}
          {message && (
            <div style={{
              marginTop: 16, padding: "10px 12px", borderRadius: 8,
              background: message.startsWith("Error") ? "rgba(244,33,46,0.1)" : "rgba(0,186,124,0.1)",
              color: message.startsWith("Error") ? C.danger : C.green,
              fontSize: 13,
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
