// mock-state.js — Shared mutable state for all p2p-mock modules.
// All domain modules import from here so they share the same in-memory store.

export let _profile = null;       // simulates Android Keystore: null = no account yet

// ── Setter functions (work around webpack 5 ESM getter-only imports) ──
// Webpack 5 treats imported `export let` bindings as getter-only properties.
// These setter functions allow other mock modules to reassign state values.
export function setProfile(p)   { _profile = p; }
export function clearProfile()  { _profile = null; }
export let _posts   = [];          // posts created this session
export let _viewCounts = {};       // track view counts per post
export let _conversations = {};    // conversations for DMs
export let _users = [              // Mock users for search
  { userId: "user_alice_key123", displayName: "Alice Johnson", handle: "alicej", bio: "Coffee lover ☕", avatar: null },
  { userId: "user_bob_key456", displayName: "Bob Smith", handle: "bobsmith", bio: "Tech enthusiast 🚀", avatar: null },
  { userId: "user_carol_key789", displayName: "Carol Williams", handle: "carolw", bio: "Artist & Designer 🎨", avatar: null },
  { userId: "user_david_key012", displayName: "David Brown", handle: "davidb", bio: "Fitness coach 💪", avatar: null },
  { userId: "user_eve_key345", displayName: "Eve Davis", handle: "eved", bio: "Travel blogger ✈️", avatar: null }
];
export let _following = {};        // Map: followerUserId -> Set of followed userIds
export let _followers = {};        // Map: userId -> Set of follower userIds

// Phase 5 mock state
export let _marketplaceItems = [];
export let _marketplaceCollections = {};
export let _groups = new Map();
export let _groupMessages = new Map();
export let _groupInvites = {};
export let _stories = [];
export let _storyReplies = {};
export let _highlights = {};
export let _callSessions = {};
export let _callHistory = [];
export let _devices = [];

// Seed mock posts for each mock user so followers can see their content.
const _mockUserPosts = [
  { text: "Just had the best espresso at this new café downtown! Highly recommend.", authorIdx: 0, hoursAgo: 1 },
  { text: "Working on a new open-source project this weekend. Stay tuned for updates!", authorIdx: 0, hoursAgo: 18 },
  { text: "React 20 is going to change everything we know about frontend development.", authorIdx: 1, hoursAgo: 3 },
  { text: "Built a real-time chat app with WebSockets in under 2 hours.", authorIdx: 1, hoursAgo: 24 },
  { text: "Finished my latest digital painting! Check out the details.", authorIdx: 2, hoursAgo: 2 },
  { text: "Color theory tip: complementary colors create the most vibrant contrasts.", authorIdx: 2, hoursAgo: 36 },
  { text: "Morning run complete — 10km personal best! Consistency pays off.", authorIdx: 3, hoursAgo: 5 },
  { text: "Protein-packed meal prep for the week. Nutrition is 80% of the work.", authorIdx: 3, hoursAgo: 48 },
  { text: "Arrived in Tokyo! The cherry blossoms are absolutely breathtaking this year.", authorIdx: 4, hoursAgo: 4 },
  { text: "Budget travel tip: book flights on Tuesdays for the best deals.", authorIdx: 4, hoursAgo: 72 },
];

(function seedMockUserPosts() {
  const now = Date.now();
  for (const mp of _mockUserPosts) {
    const user = _users[mp.authorIdx];
    const post = {
      id: "post_mock_" + mp.authorIdx + "_" + mp.hoursAgo,
      authorId: user.userId, authorName: user.displayName, authorHandle: user.handle, authorAvatar: user.avatar,
      text: mp.text, image: null, video: null, videoUrl: null, videoHash: null,
      timestamp: now - (mp.hoursAgo * 3600000),
      likes: Math.floor(Math.random() * 200) + 5, dislikes: Math.floor(Math.random() * 10),
      retweets: Math.floor(Math.random() * 50), replies: Math.floor(Math.random() * 20) + 1,
      views: Math.floor(Math.random() * 5000) + 100,
      liked: false, disliked: false, retweeted: false, bookmarked: false, isMine: false, postType: "post"
    };
    _posts.push(post);
    _viewCounts[post.id] = post.views;
  }
})();
