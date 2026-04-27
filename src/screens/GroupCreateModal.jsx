// File: src/screens/GroupCreateModal.jsx
import { useState } from "react";
import { C } from "../theme.js";

const MAX_MEMBER_OPTIONS = [10, 25, 50, 100, 200];

export default function GroupCreateModal({ p2p, me, onClose, onCreated }) {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers,  setMaxMembers]  = useState(50);
  const [creating,    setCreating]    = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !p2p) return;
    setCreating(true);
    try {
      await p2p.groupCreate?.({
        creatorId: me?.userId,
        name: name.trim(),
        description: description.trim(),
        maxMembers,
      });
      await onCreated?.();
    } catch (e) {
      alert("Failed to create group: " + (e.message || "Unknown error"));
      setCreating(false);
    }
  };

  const canCreate = name.trim() && !creating;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.6)" }}/>

      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 101,
        background: C.card, borderRadius: "20px 20px 0 0",
        padding: "16px 20px 0", paddingBottom: "max(32px, env(safe-area-inset-bottom))",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}/>
        </div>

        <h3 style={{ color: C.text, fontWeight: 800, fontSize: 18, margin: "0 0 20px" }}>Create Group</h3>

        {/* Group name */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Group Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Crypto Enthusiasts"
            style={{
              width: "100%", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15,
              outline: "none", boxSizing: "border-box",
            }}/>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Description</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What's this group about?" rows={3}
            style={{
              width: "100%", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 14,
              resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5,
            }}/>
        </div>

        {/* Max members */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Max Members</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MAX_MEMBER_OPTIONS.map(n => (
              <button key={n} onClick={() => setMaxMembers(n)} style={{
                background: maxMembers === n ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
                border: maxMembers === n ? "none" : `1px solid ${C.border}`,
                borderRadius: 20, padding: "8px 16px",
                color: maxMembers === n ? "#000" : C.text,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <button onClick={handleCreate} disabled={!canCreate} style={{
          width: "100%", background: canCreate ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
          border: "none", borderRadius: 24, padding: "14px 0",
          color: canCreate ? "#000" : C.muted, fontWeight: 800, fontSize: 16,
          cursor: canCreate ? "pointer" : "default", marginBottom: 10,
        }}>
          {creating ? "Creating…" : "Create Group"}
        </button>
        <button onClick={onClose} style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: "10px 0", color: C.muted, fontSize: 15,
        }}>
          Cancel
        </button>
      </div>
    </>
  );
}
