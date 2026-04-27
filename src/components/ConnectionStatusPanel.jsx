// ── Connection status panel (dropdown from the dot) ──────────────────────────
export default function ConnectionStatusPanel({ status, mothershipStatus, onClose, onGoToSettings, onDisconnectMothership }) {
  const nodeConnected = status?.connected;
  const msConnected = mothershipStatus?.connected;
  const isOnline = nodeConnected || msConnected;
  const nodeUrl = status?.relayUrl || "";
  const msNode = mothershipStatus?.assignedNode;

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(0,0,0,.25)" }}/>
      <div style={{
        position:"fixed", top: "calc(env(safe-area-inset-top) + 8px)", right:12, zIndex:160,
        background:"#ffffff", border:"1px solid #e0e0e0", borderRadius:14,
        padding:"14px 18px", width:280, boxShadow:"0 8px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{
            width:12, height:12, borderRadius:"50%",
            background: isOnline ? "#00ba7c" : "#f4212e",
            boxShadow: `0 0 8px ${isOnline ? "#00ba7c" : "#f4212e"}`,
          }}/>
          <span style={{ color:"#262626", fontSize:15, fontWeight:700 }}>
            {nodeConnected ? "Connected to Node" : msConnected ? "Connected via Mother Ship" : "Disconnected"}
          </span>
        </div>

        {/* Node status */}
        {nodeConnected && nodeUrl && (
          <div style={{ marginBottom:8 }}>
            <div style={{ color:"#00ba7c", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Echo Node</div>
            <div style={{ color:"#999999", fontSize:12, wordBreak:"break-all", lineHeight:1.4 }}>{nodeUrl}</div>
          </div>
        )}

        {/* Mother Ship status */}
        {msConnected && !nodeConnected && (
          <div style={{ marginBottom:8 }}>
            <div style={{ color:"#D4AF37", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Mother Ship</div>
            {msNode && (
              <div style={{ color:"#999999", fontSize:12, wordBreak:"break-all", lineHeight:1.4 }}>
                Node: {msNode.localAddress || msNode.publicKey?.substring(0, 16) || "unknown"}
              </div>
            )}
          </div>
        )}

        {/* Disconnected */}
        {!isOnline && (
          <p style={{ color:"#999999", fontSize:13, margin:"0 0 12px", lineHeight:1.4 }}>
            Cannot reach your Echo Node. Tap below to update connection settings.
          </p>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => { onClose(); onGoToSettings(); }} style={{
            flex:1, background: isOnline ? "#f5f5f5" : "#000000",
            border: isOnline ? "1px solid #e0e0e0" : "none",
            borderRadius:10, padding:"10px 0", color: isOnline ? "#262626" : "#fff",
            fontWeight:700, fontSize:14, cursor:"pointer",
          }}>
            {isOnline ? "Settings" : "Go to Settings"}
          </button>
          {msConnected && !nodeConnected && onDisconnectMothership && (
            <button onClick={() => { onClose(); onDisconnectMothership(); }} style={{
              flex:1, background:"#fff5f5", border:"1px solid #fdd",
              borderRadius:10, padding:"10px 0", color:"#f4212e",
              fontWeight:700, fontSize:14, cursor:"pointer",
            }}>
              Disconnect
            </button>
          )}
        </div>
      </div>
    </>
  );
}
