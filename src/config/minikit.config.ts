// Base Mini App Configuration for Tarot Forge
const ROOT_URL = import.meta.env.VITE_APP_URL || 'https://tarotforge.xyz';

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEzNTA1NTksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhmODZmN2ExOTQyN2Q3YjU4MjE3MjFGMmNBNUU4MTM1MTM1QTU3RDM0In0",
    payload: "eyJkb21haW4iOiJ0YXJvdGZvcmdlLnh5eiJ9",
    signature: "YaoK9mZKONgMwgz4yUd4/HMRmitVp1rwoMnNb1mDUqoUd+2C8bAtbYh+n8o9Avvja/VJ63JRI8OVD/7FobBkERs="
  },
  miniapp: {
    version: "1",
    name: "Tarot Forge",
    subtitle: "AI-Powered Tarot Deck Creator",
    description: "Create and collect unique AI-generated tarot decks. Experience professional readings with custom decks, buy and sell in the marketplace.",
    screenshotUrls: [
      `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/9dbf50f7-ed02-4615-8866-1efa4c3bf6c0.png`,
      `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/4d49ca50-3550-4a13-bd48-5d7b670b932d.png`,
      `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/3a0a8ce6-1e67-4067-974a-b027808de40b.png`,
      `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/34710876-cb54-44ac-9104-90ccd21a558a.png`
    ],
    iconUrl: `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/logotarot.png`,
    splashImageUrl: `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/logotarot.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/base-webhook`,
    primaryCategory: "entertainment",
    tags: ["tarot", "ai", "marketplace", "spiritual", "web3", "nft", "collectibles", "readings"],
    heroImageUrl: `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/readingroom.webp`,
    tagline: "Forge Your Destiny with AI-Powered Tarot",
    ogTitle: "Tarot Forge - AI Tarot Deck Creator & Marketplace",
    ogDescription: "Create unique AI-generated tarot decks, get professional readings, and trade in the marketplace. Experience the future of digital divination.",
    ogImageUrl: `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/readingroom.webp`,
    castShareUrl: ROOT_URL,
    imageUrl: `https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/9dbf50f7-ed02-4615-8866-1efa4c3bf6c0.png`,
    buttonTitle: "Open Tarot Forge",
  },
  baseBuilder: {
    ownerAddress: "0x7a32D0c29155B56517a152368F9FA506AF971Fd4"
  }
} as const;

export default minikitConfig;