import { C } from "../../theme.js";
import Sheet from "../../components/Sheet.jsx";
import Avatar from "../../components/Avatar.jsx";

// ── Image picker ──────────────────────────────────────────────────────────────
async function pickImage() {
  try {
    const { Camera, CameraResultType, CameraSource } = await import("../../capacitor-camera-shim.js");
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
}

// ── Edit Profile Sheet ──────────────────────────────────────────────────────
export default function EditProfileSheet({
  show, onClose, onModalOpen, onModalClose,
  me, editForm, setEditForm, avatarPrev, bannerPrev,
  setAvatarPrev, setBannerPrev, saving, onSave,
}) {
  const handlePickAvatar = async () => {
    const img = await pickImage();
    if (img) { setAvatarPrev(img); setEditForm(f => ({ ...f, avatar: img })); }
  };
  const handlePickBanner = async () => {
    const img = await pickImage();
    if (img) { setBannerPrev(img); setEditForm(f => ({ ...f, banner: img })); }
  };

  return (
    <Sheet show={show} onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose} title="Edit profile">
      {/* Banner */}
      <div style={{ marginBottom:16 }}>
        <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>Banner image</div>
        <div onClick={handlePickBanner}
          style={{ height:90, borderRadius:10, border:`2px dashed ${C.border}`, background: bannerPrev || me.banner ? `url(${bannerPrev||me.banner}) center/cover` : C.surface, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          {!bannerPrev && !me.banner && <span style={{ color:C.muted, fontSize:13 }}>Tap to set banner</span>}
        </div>
      </div>
      {/* Avatar */}
      <div style={{ marginBottom:16 }}>
        <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>Profile photo</div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <Avatar src={avatarPrev || me.avatar} seed={me.userId} size={64} style={{ border:`2px solid ${C.border}` }}/>
          <button onClick={handlePickAvatar}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:"8px 18px", color:C.text, fontSize:14, cursor:"pointer" }}>
            Change photo
          </button>
        </div>
      </div>
      {/* Name */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"18px 14px 8px", marginBottom:12, position:"relative" }}>
        <span style={{ position:"absolute", top:6, left:14, color:C.muted, fontSize:11 }}>Name</span>
        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
          style={{ width:"100%", background:"none", border:"none", outline:"none", color:C.text, fontSize:16, padding:0, boxSizing:"border-box" }}/>
      </div>
      {/* Bio */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"18px 14px 8px", marginBottom:20, position:"relative" }}>
        <span style={{ position:"absolute", top:6, left:14, color:C.muted, fontSize:11 }}>Bio</span>
        <input value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
          style={{ width:"100%", background:"none", border:"none", outline:"none", color:C.text, fontSize:16, padding:0, boxSizing:"border-box" }}/>
      </div>
      <button onClick={onSave} disabled={saving} style={{ width:"100%", background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, border:"none", borderRadius:24, padding:"14px 0", color:"#000", fontWeight:800, fontSize:16, cursor:"pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </Sheet>
  );
}
