# Privy Web3 Wallet Integration Guide

## Overview

Tarot Forge now supports hybrid Web2/Web3 authentication, combining Supabase for traditional authentication with Privy for wallet connectivity. This allows users to:

- Sign in with Google or Email (Web2)
- Connect crypto wallets (Web3)
- Access NFT features when both are connected
- Seamlessly link wallets to existing accounts

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Tarot Forge App                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────┐    ┌───────────────────┐       │
│  │  Supabase Auth    │    │   Privy Wallet    │       │
│  │  (Web2)           │◄───┤   (Web3)          │       │
│  │                   │    │                   │       │
│  │  - Google OAuth   │    │  - Ethereum       │       │
│  │  - Magic Link     │    │  - Solana         │       │
│  │  - Email          │    │  - Base           │       │
│  └───────────────────┘    └───────────────────┘       │
│           │                         │                  │
│           └──────────┬──────────────┘                  │
│                      │                                 │
│              ┌───────▼────────┐                        │
│              │  Hybrid Auth   │                        │
│              │  Hook          │                        │
│              └────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Ensure your `.env` file has the Privy configuration:

```bash
# Privy Configuration
VITE_PRIVY_APP_ID=your_privy_app_id_here

# Optional: WalletConnect Project ID for enhanced wallet support
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 2. Database Migration

Run the wallet fields migration:

```bash
# Using Supabase CLI
supabase db push supabase/migrations/add_wallet_fields.sql

# Or apply directly in Supabase SQL Editor
```

This adds:
- `wallet_addresses` (JSONB) - Stores multiple wallet addresses
- `privy_user_id` (TEXT) - Links to Privy user
- `nft_features_enabled` (BOOLEAN) - Access flag for NFT features

### 3. Privy Dashboard Configuration

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Create or select your app
3. Configure supported chains:
   - Ethereum (Mainnet)
   - Base (Mainnet)
   - Solana (Mainnet)
4. Enable login methods:
   - Email
   - Google
   - Wallet
5. Copy your App ID to `.env` as `VITE_PRIVY_APP_ID`

### 4. Test the Integration

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

## User Flows

### Flow 1: New User with Wallet

```
1. User clicks "Connect Wallet" in Sign In Modal
2. Privy modal opens → User selects wallet
3. Wallet connection approved
4. Account created in both Privy and Supabase
5. User has immediate access to NFT features
```

### Flow 2: Existing Web2 User Adds Wallet

```
1. User signs in with Google/Email
2. WalletEnhancementModal appears (optional prompt)
3. User clicks "Connect Wallet"
4. Wallet connected via Privy
5. Wallet address linked to Supabase user
6. NFT features unlocked
```

### Flow 3: Wallet User with Existing Email

```
1. User connects wallet
2. System detects existing account with same email
3. Accounts automatically merged
4. User gains access to both Web2 and Web3 features
```

## Component Structure

### Core Components

1. **PrivyProviderWrapper** (`src/providers/PrivyProvider.tsx`)
   - Wraps app with Privy configuration
   - Manages wallet connection state
   - Configures supported chains

2. **useHybridAuth Hook** (`src/hooks/useHybridAuth.ts`)
   - Combines Supabase + Privy state
   - Provides wallet connection methods
   - Manages NFT feature access

3. **SignInModal** (`src/components/auth/SignInModal.tsx`)
   - Enhanced with "Connect Wallet" button
   - Handles all auth flows
   - Gradient styling for wallet option

4. **WalletEnhancementModal** (`src/components/auth/WalletEnhancementModal.tsx`)
   - Post-login wallet prompt
   - Shows NFT feature benefits
   - Optional enhancement flow

## Using the Hybrid Auth Hook

```typescript
import { useHybridAuth } from '@/hooks/useHybridAuth';

function MyComponent() {
  const {
    // Supabase state
    supabaseUser,
    isSupabaseAuthenticated,

    // Privy wallet state
    privyUser,
    walletAddress,
    isWalletConnected,

    // Combined capabilities
    canAccessNFTFeatures,
    hasWallet,

    // Methods
    connectWallet,
    linkWalletToAccount,
    disconnectWallet,

    // Loading
    isLinkingWallet
  } = useHybridAuth();

  return (
    <div>
      {isSupabaseAuthenticated && !isWalletConnected && (
        <button onClick={connectWallet}>
          Connect Wallet for NFT Features
        </button>
      )}

      {canAccessNFTFeatures && (
        <div>
          🎉 You have access to NFT features!
          <p>Connected wallet: {walletAddress}</p>
        </div>
      )}
    </div>
  );
}
```

## Database Schema

### Updated `users` Table

```sql
users {
  id UUID PRIMARY KEY
  email TEXT
  username TEXT
  -- ... existing fields ...

  -- New Web3 fields
  wallet_addresses JSONB DEFAULT '{}'
  privy_user_id TEXT
  nft_features_enabled BOOLEAN DEFAULT FALSE
}
```

### Wallet Addresses Format

```json
{
  "ethereum": "0x742d35Cc6634C0532925a3b8D4e5a2cBb3B8E5A3",
  "solana": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5pTHW6",
  "base": "0x742d35Cc6634C0532925a3b8D4e5a2cBb3B8E5A3"
}
```

## Styling

The wallet connect button uses mystical gradient styling:

```css
/* Wallet button gradient */
background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
border: 1px solid rgba(139, 92, 246, 0.5);

/* Text gradient */
background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

## NFT Feature Gating

Check if user can access NFT features:

```typescript
const { canAccessNFTFeatures } = useHybridAuth();

if (canAccessNFTFeatures) {
  // Show NFT marketplace, rental features, etc.
}
```

## Troubleshooting

### Wallet Not Connecting

1. Check Privy App ID in `.env`
2. Verify wallet extension is installed
3. Check browser console for errors
4. Ensure correct chain is selected in wallet

### User Can't Access NFT Features

1. Verify both `isSupabaseAuthenticated` and `isWalletConnected` are true
2. Check `nft_features_enabled` field in database
3. Verify `wallet_addresses` field is not empty

### Database Migration Issues

1. Check Supabase connection
2. Verify RLS policies don't block updates
3. Run migration in SQL Editor manually if CLI fails

## Next Steps

### Implement NFT Features

Now that wallet authentication is set up, you can implement:

1. **NFT Deck Marketplace**
   - List NFT decks for rent
   - Browse available NFT decks
   - Rent decks with crypto payments

2. **Token-Gated Content**
   - Premium readings for NFT holders
   - Exclusive deck access
   - Community features

3. **NFT Minting**
   - Mint reading results as NFTs
   - Create custom deck NFTs
   - Certificate NFTs for readers

4. **Multi-Chain Support**
   - Ethereum marketplace
   - Solana NFTs
   - Base Network for low fees

## Support

For issues or questions:
- Privy Documentation: https://docs.privy.io/
- Supabase Documentation: https://supabase.com/docs
- GitHub Issues: https://github.com/your-repo/issues

## License

This integration is part of Tarot Forge and follows the project's license.
