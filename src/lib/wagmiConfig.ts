import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, walletConnect, injected } from 'wagmi/connectors';

// Get Base RPC URL from environment or use default
const baseRpcUrl = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org';
const baseSepoliaRpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// WalletConnect project ID - you'll need to get one from https://cloud.walletconnect.com
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'TarotForge',
      appLogoUrl: 'https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/logotarot.png',
      preference: 'smartWalletOnly', // Use smart wallets by default
    }),
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: 'TarotForge',
        description: 'Connect your wallet to TarotForge',
        url: 'https://tarotforge.xyz',
        icons: ['https://euqhrxgmbmcgzmdunprq.supabase.co/storage/v1/object/public/assets/logotarot.png'],
      },
    }),
  ],
  transports: {
    [base.id]: http(baseRpcUrl),
    [baseSepolia.id]: http(baseSepoliaRpcUrl),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
