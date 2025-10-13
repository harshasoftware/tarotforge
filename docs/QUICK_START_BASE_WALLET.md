# Quick Start: Base Wallet Integration

Get Base wallet linking up and running in 5 minutes!

## Prerequisites

- ✅ Existing TarotForge app with Google OAuth
- ✅ Supabase project set up
- ✅ Node.js and npm installed

## Step 1: Get a WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up or log in
3. Create a new project
4. Copy your Project ID

## Step 2: Update Environment Variables

Add to your `.env` file:

```env
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## Step 3: Run Database Migration

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration manually in Supabase dashboard
# Navigate to SQL Editor and run the migration file:
# supabase/migrations/20250113000000_create_user_wallets.sql
```

## Step 4: Wrap Your App with WagmiProvider

```tsx
// src/main.tsx
import { WagmiProvider } from './components/providers/WagmiProvider';

// Wrap your app
<WagmiProvider>
  <App />
</WagmiProvider>
```

## Step 5: Add to User Profile

```tsx
// In your user profile page
import { LinkedWallets } from './components/wallet/LinkedWallets';

function Profile() {
  return (
    <div>
      <h1>Profile</h1>
      <LinkedWallets />
    </div>
  );
}
```

## Step 6: Test It Out!

1. **Sign in** with Google OAuth
2. Navigate to your **profile page**
3. Click **"Link Wallet"**
4. Connect with **Coinbase Wallet** or **WalletConnect**
5. **Sign** the verification message
6. ✅ **Done!** Your wallet is linked

## Troubleshooting

### Can't see "Link Wallet" button?
- Make sure you're signed in with Google OAuth first
- Check that WagmiProvider is wrapping your app

### Connection fails?
- Verify your WalletConnect Project ID is correct
- Check that wallet extension is installed and unlocked
- Try a different wallet provider

### Signature verification fails?
- Ensure you're on Base network (chain ID 8453)
- Try disconnecting and reconnecting wallet
- Clear browser cache and try again

## What's Next?

- Read the [full documentation](./BASE_WALLET_INTEGRATION.md)
- Explore wallet-gated features
- Implement token verification
- Add Web3 functionality

## Common Use Cases

### Show wallet address in UI

```tsx
import { useAuthStore } from './stores/authStore';

function WalletDisplay() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);

  return (
    <div>
      {linkedWallets.map(wallet => (
        <div key={wallet.id}>
          {wallet.wallet_address.slice(0, 6)}...{wallet.wallet_address.slice(-4)}
        </div>
      ))}
    </div>
  );
}
```

### Check if user has wallet linked

```tsx
import { useAuthStore } from './stores/authStore';

function ProtectedFeature() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const hasWallet = linkedWallets.length > 0;

  if (!hasWallet) {
    return <p>Please link a wallet to access this feature</p>;
  }

  return <div>Web3 Feature Content</div>;
}
```

### Programmatically link wallet

```tsx
import { useAuthStore } from './stores/authStore';
import { generateSiweMessage, generateNonce } from './lib/baseWalletAuth';
import { useSignMessage, useAccount } from 'wagmi';

function CustomLinkButton() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const linkBaseWallet = useAuthStore((state) => state.linkBaseWallet);

  const handleLink = async () => {
    if (!address) return;

    const nonce = generateNonce();
    const message = await generateSiweMessage(address, nonce);
    const signature = await signMessageAsync({ message });

    await linkBaseWallet(address, signature, message, nonce);
  };

  return <button onClick={handleLink}>Link My Wallet</button>;
}
```

## Need Help?

- 📚 Read the [full documentation](./BASE_WALLET_INTEGRATION.md)
- 🐛 Report issues on GitHub
- 💬 Join our Discord community

## That's it! 🎉

You now have Base wallet linking integrated into your app. Users can link their wallets to their Google OAuth accounts and you can build Web3 features on top of this foundation.
