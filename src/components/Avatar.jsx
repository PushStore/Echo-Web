import { C } from "../theme.js";

export default function Avatar({ src, seed, size = 42, style = {}, onClick }) {
  return (
    <img
      src={src || `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`}
      onClick={onClick}
      style={{
        width:size, height:size, borderRadius:"50%",
        objectFit:"cover", background:C.surface, flexShrink:0,
        ...style,
      }}
    />
  );
}
