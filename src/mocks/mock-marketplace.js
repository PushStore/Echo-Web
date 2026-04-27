// mock-marketplace.js — Content marketplace mock methods
import { _profile, _marketplaceItems, _marketplaceCollections } from "./mock-state.js";

export async function marketplacePublish({ title, description, contentType, category, tags, mediaUrl, price }) {
  if (!_profile) return { success: false, error: "No profile" };
  const contentId = "mp_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
  const item = {
    contentId, authorId: _profile.userId, authorName: _profile.name, authorHandle: _profile.handle,
    title, description: description || "", contentType: contentType || "text",
    category: category || "general", tags: tags || [], mediaUrl: mediaUrl || null,
    price: price || 0, downloads: 0, rating: 0, ratingCount: 0,
    createdAt: Date.now(), updatedAt: Date.now()
  };
  _marketplaceItems.push(item);
  console.log('[Mock] marketplacePublish:', title);
  return { success: true, contentId };
}

export async function marketplaceGetContent({ contentId }) {
  const item = _marketplaceItems.find(i => i.contentId === contentId);
  if (!item) return { success: false, error: "Not found" };
  return { success: true, content: item };
}

export async function marketplaceSearch({ query, offset = 0, limit = 20 }) {
  const q = (query || "").toLowerCase();
  const results = _marketplaceItems.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.description.toLowerCase().includes(q) ||
    i.tags.some(t => t.toLowerCase().includes(q))
  ).slice(offset, offset + limit);
  return { items: results, count: results.length, total: _marketplaceItems.length, offset, limit };
}

export async function marketplaceGetByCategory({ category, offset = 0, limit = 20 }) {
  const results = _marketplaceItems.filter(i => i.category === category).slice(offset, offset + limit);
  return { items: results, count: results.length, category };
}

export async function marketplaceGetByTag({ tag, offset = 0, limit = 20 }) {
  const results = _marketplaceItems.filter(i => i.tags.includes(tag)).slice(offset, offset + limit);
  return { items: results, count: results.length, tag };
}

export async function marketplaceGetTrending({ category, limit = 10 }) {
  const items = category ? _marketplaceItems.filter(i => i.category === category) : _marketplaceItems;
  const sorted = [...items].sort((a, b) => b.downloads - a.downloads).slice(0, limit);
  return { items: sorted, count: sorted.length };
}

export async function marketplaceGetByAuthor({ authorId, offset = 0, limit = 20 }) {
  const results = _marketplaceItems.filter(i => i.authorId === authorId).slice(offset, offset + limit);
  return { items: results, count: results.length };
}

export async function marketplaceCreateCollection({ name, description, contentIds, isPublic = true }) {
  const collectionId = "mc_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
  _marketplaceCollections[collectionId] = {
    collectionId, name, description: description || "", contentIds: contentIds || [],
    isPublic, authorId: _profile?.userId, createdAt: Date.now()
  };
  return { success: true, collectionId };
}

export async function marketplaceGetCollection({ collectionId }) {
  const col = _marketplaceCollections[collectionId];
  if (!col) return { success: false, error: "Not found" };
  return { success: true, collection: col };
}

export async function marketplaceAddToCollection({ collectionId, contentId }) {
  const col = _marketplaceCollections[collectionId];
  if (col && !col.contentIds.includes(contentId)) col.contentIds.push(contentId);
  return { success: true };
}

export async function marketplaceCreatorStats({ authorId }) {
  const items = _marketplaceItems.filter(i => i.authorId === authorId);
  return { totalItems: items.length, totalDownloads: items.reduce((s, i) => s + i.downloads, 0), totalRevenue: 0 };
}

export async function marketplaceGetStats() {
  return { totalItems: _marketplaceItems.length, totalCollections: Object.keys(_marketplaceCollections).length, totalDownloads: 0 };
}
