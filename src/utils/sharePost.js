/**
 * Share a post using the native share sheet (or clipboard as fallback).
 *
 * @param {Object} post — must have `text` and `authorHandle`
 * @returns {"shared"|"copied"|"cancelled"|null}
 */
export default async function sharePost(post) {
  const appLink = "https://play.google.com/store/apps/details?id=io.github.echoupdates.echo";
  const shareText = (post.text ? `"${post.text}"\n\n` : "") +
    `— @${post.authorHandle} on Echo\n${appLink}`;
  // navigator.share opens the native Android share sheet (WhatsApp, X, Telegram etc)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Echo post", text: shareText });
      return "shared";
    } catch (e) {
      // User cancelled — not an error
      if (e.name === "AbortError") return "cancelled";
    }
  }
  // Fallback: clipboard
  try {
    await navigator.clipboard.writeText(shareText);
    return "copied";
  } catch (_) { return null; }
}
