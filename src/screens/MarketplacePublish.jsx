// File: src/screens/MarketplacePublish.jsx
import { useState } from "react";
import { C } from "../theme.js";

const CONTENT_TYPES = ["Article", "Media", "Link", "Poll"];
const CATEGORIES = ["Technology", "Science", "Art", "Music", "Gaming", "Education", "News", "Health", "Sports", "Finance", "Lifestyle"];

export default function MarketplacePublish({ p2p, onClose, onPublished }) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("Article");
  const [category,    setCategory]    = useState(CATEGORIES[0]);
  const [tags,        setTags]        = useState([]);
  const [tagInput,    setTagInput]    = useState("");
  const [mediaUrl,    setMediaUrl]    = useState("");
  const [price,       setPrice]       = useState("0");
  const [publishing,  setPublishing]  = useState(false);
  const [posted,      setPosted]      = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));

  const handlePublish = async () => {
    if (!title.trim() || !p2p) return;
    setPublishing(true);
    try {
      await p2p.marketplacePublish?.({
        title: title.trim(),
        description: description.trim(),
        contentType,
        category,
        tags,
        mediaUrl: mediaUrl.trim() || undefined,
        price: parseFloat(price) || 0,
      });
      setPosted(true);
      await onPublished?.();
      setTimeout(onClose, 700);
    } catch (e) {
      alert("Failed to publish: " + (e.message || "Unknown error"));
      setPublishing(false);
    }
  };

  const canPublish = title.trim() && !publishing && !posted;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.6)" }}/>

      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 101,
        background: C.card, borderRadius: "20px 20px 0 0",
        padding: "16px 20px 0", paddingBottom: "max(32px, env(safe-area-inset-bottom))",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <span style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>Publish to Marketplace</span>
          <button onClick={handlePublish} disabled={!canPublish} style={{
            background: canPublish ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
            border: "none", borderRadius: 20, padding: "9px 22px",
            color: canPublish ? "#000" : C.muted, fontWeight: 800, fontSize: 15, cursor: canPublish ? "pointer" : "default",
          }}>
            {posted ? "Posted! ✓" : publishing ? "…" : "Publish"}
          </button>
        </div>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
          style={{
            width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 16,
            fontWeight: 600, outline: "none", boxSizing: "border-box", marginBottom: 12,
          }}/>

        {/* Description */}
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description…"
          rows={3} style={{
            width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 14,
            resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 12, lineHeight: 1.5,
          }}/>

        {/* Content type selector */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Content Type</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CONTENT_TYPES.map(type => (
              <button key={type} onClick={() => setContentType(type)} style={{
                background: contentType === type ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : C.surface,
                border: contentType === type ? "none" : `1px solid ${C.border}`,
                borderRadius: 20, padding: "6px 14px",
                color: contentType === type ? "#000" : C.text,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Category dropdown */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Category</div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{
            width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
            outline: "none", boxSizing: "border-box",
          }}>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Tags (comma separated)</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {tags.map(t => (
              <span key={t} style={{
                background: "rgba(110,231,183,0.12)", color: C.accent,
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 12,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                #{t}
                <span onClick={() => removeTag(t)} style={{ cursor: "pointer", marginLeft: 2, opacity: 0.7 }}>×</span>
              </span>
            ))}
          </div>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag…"
            style={{
              width: "100%", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
              outline: "none", boxSizing: "border-box",
            }}/>
        </div>

        {/* Media URL */}
        <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="Media URL (optional)"
          style={{
            width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
            outline: "none", boxSizing: "border-box", marginBottom: 12,
          }}/>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Price</div>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01"
              style={{
                width: "100%", background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 14px 10px 28px", color: C.text, fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}/>
          </div>
          <span style={{ color: C.muted, fontSize: 12 }}>0 = free</span>
        </div>
      </div>
    </>
  );
}
