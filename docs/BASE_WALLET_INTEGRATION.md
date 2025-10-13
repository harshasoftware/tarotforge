# Base Wallet Integration Guide

This guide explains how to integrate Base wallet authentication (using Sign-In with Ethereum EIP-4361) into your TarotForge application, allowing users to link their Base wallets to their existing Google OAuth accounts.

## Overview

The Base wallet integration allows users to:
- Sign in with Google OAuth (primary authentication)
- Link their Base wallet to their account
- Unlink Base wallets when needed
- View all linked wallets in their account settings

## Architecture

### Authentication Flow

1. **Primary Auth**: User signs in with Google OAuth via Supabase
2. **Wallet Linking**: User connects their Base wallet and signs a SIWE message
3. **Verification**: Backend verifies the signature and links the wallet to the user's account
4. **Management**: User can view and unlink wallets from their account settings

### Key Components

- **SIWE (Sign-In with Ethereum)**: EIP-4361 standard for wallet authentication
- **Wagmi**: React hooks for Ethereum wallet interactions
- **Base Network**: Layer 2 Ethereum network by Coinbase
- **Supabase**: Backend database for storing wallet links

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Base Network Configuration
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# WalletConnect Project ID (Get one from: https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**Get a WalletConnect Project ID:**
1. Visit https://cloud.walletconnect.com
2. Create a free account
3. Create a new project
4. Copy your Project ID

### 2. Database Migration

Run the Supabase migration to create the `user_wallets` table:

```bash
# Apply the migration
supabase db push

# Or if using Supabase CLI locally
supabase migration up
```

The migration creates:
- `user_wallets` table with proper RLS policies
- Indexes for fast lookups
- Triggers for automatic timestamp updates

### 3. Add WagmiProvider to Your App

Wrap your application with the `WagmiProvider`:

```tsx
// src/main.tsx or src/App.tsx
import { WagmiProvider } from './components/providers/WagmiProvider';
import { AuthProvider } from './components/providers/AuthProvider';

function App() {
  return (
    <WagmiProvider>
      <AuthProvider>
        {/* Your app content */}
      </AuthProvider>
    </WagmiProvider>
  );
}
```

### 4. Add Wallet Management to User Profile

Import and use the `LinkedWallets` component in your user profile/settings page:

```tsx
import { LinkedWallets } from './components/wallet/LinkedWallets';

function UserProfile() {
  return (
    <div>
      {/* Other profile sections */}

      <LinkedWallets />
    </div>
  );
}
```

## Usage

### For Users

1. **Sign in with Google**
   - Click "Sign in with Google"
   - Authenticate with your Google account

2. **Link a Base Wallet**
   - Navigate to your profile/settings
   - Click "Link Wallet" button
   - Choose a wallet provider (Coinbase Wallet, WalletConnect, etc.)
   - Connect your wallet
   - Sign the verification message (free, no gas fees)
   - Your wallet is now linked!

3. **Unlink a Wallet**
   - Navigate to your profile/settings
   - Find the wallet you want to unlink
   - Click the trash icon
   - Confirm the action

### For Developers

#### Link a Wallet Programmatically

```tsx
import { useAuthStore } from './stores/authStore';
import { generateSiweMessage, generateNonce } from './lib/baseWalletAuth';
import { useSignMessage } from 'wagmi';

function MyComponent() {
  const linkBaseWallet = useAuthStore((state) => state.linkBaseWallet);
  const { signMessageAsync } = useSignMessage();

  const handleLinkWallet = async (address: `0x${string}`) => {
    // Generate nonce
    const nonce = generateNonce();

    // Generate SIWE message
    const message = await generateSiweMessage(address, nonce);

    // Get signature from user
    const signature = await signMessageAsync({ message });

    // Link wallet
    const result = await linkBaseWallet(address, signature, message, nonce);

    if (result.error) {
      console.error('Failed to link wallet:', result.error);
    } else {
      console.log('Wallet linked successfully!');
    }
  };

  return <button onClick={() => handleLinkWallet('0x...')}>Link Wallet</button>;
}
```

#### Fetch Linked Wallets

```tsx
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';

function MyComponent() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const fetchLinkedWallets = useAuthStore((state) => state.fetchLinkedWallets);

  useEffect(() => {
    fetchLinkedWallets();
  }, []);

  return (
    <div>
      {linkedWallets.map((wallet) => (
        <div key={wallet.id}>
          {wallet.wallet_address}
        </div>
      ))}
    </div>
  );
}
```

#### Unlink a Wallet

```tsx
import { useAuthStore } from './stores/authStore';

function MyComponent() {
  const unlinkBaseWallet = useAuthStore((state) => state.unlinkBaseWallet);

  const handleUnlink = async (address: `0x${string}`) => {
    const result = await unlinkBaseWallet(address);

    if (result.error) {
      console.error('Failed to unlink:', result.error);
    } else {
      console.log('Wallet unlinked!');
    }
  };

  return <button onClick={() => handleUnlink('0x...')}>Unlink</button>;
}
```

## Security Considerations

### SIWE Message Verification

- Nonces are generated using `crypto.getRandomValues()` for cryptographic security
- Messages include domain, origin, and timestamp to prevent replay attacks
- Signatures are verified both client-side and server-side
- Wallet addresses are stored in lowercase for consistency

### Row Level Security (RLS)

The `user_wallets` table has strict RLS policies:
- Users can only view their own wallets
- Users can only link wallets to their own account
- Users can only unlink their own wallets
- No public access is allowed

### Best Practices

1. **Always verify signatures server-side** (already implemented)
2. **Use HTTPS in production** (enforce secure connections)
3. **Rate limit wallet linking attempts** (prevent abuse)
4. **Validate wallet addresses** (check format and checksum)
5. **Monitor for suspicious activity** (multiple failed attempts)

## Troubleshooting

### "Failed to connect wallet"

**Possible causes:**
- User rejected connection
- Wallet extension not installed
- Network connectivity issues

**Solution:**
- Ensure the wallet extension is installed and unlocked
- Check browser console for errors
- Try a different wallet provider

### "Invalid signature"

**Possible causes:**
- User rejected signature request
- Nonce mismatch
- Message format incorrect

**Solution:**
- Regenerate nonce and try again
- Ensure message follows EIP-4361 format
- Check for any custom message modifications

### "Wallet already linked to another account"

**Possible causes:**
- Wallet is already linked to a different user

**Solution:**
- User must first unlink the wallet from the other account
- Or use a different wallet address

### "Database error"

**Possible causes:**
- RLS policies blocking the operation
- Network issues with Supabase

**Solution:**
- Check Supabase connection
- Verify RLS policies are correctly set
- Check user authentication status

## API Reference

### baseWalletAuth.ts

#### `generateSiweMessage(address, nonce, chainId?)`

Generates a SIWE message for wallet verification.

**Parameters:**
- `address` (Address): Ethereum wallet address
- `nonce` (string): Cryptographic nonce
- `chainId` (number): Chain ID (default: 8453 for Base mainnet)

**Returns:** Promise<string> - SIWE message

#### `verifyWalletSignature(params)`

Verifies the wallet signature and links the wallet to the user's account.

**Parameters:**
- `message` (string): SIWE message
- `signature` (string): Wallet signature
- `address` (Address): Wallet address
- `nonce` (string): Nonce used in message
- `userId` (string): User ID to link wallet to

**Returns:** Promise<WalletLinkResult>

#### `unlinkWallet(userId, walletAddress)`

Unlinks a wallet from the user's account.

**Parameters:**
- `userId` (string): User ID
- `walletAddress` (Address): Wallet address to unlink

**Returns:** Promise<WalletLinkResult>

#### `getUserWallets(userId)`

Fetches all wallets linked to a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<{ wallets: LinkedWallet[], error: any }>

#### `generateNonce()`

Generates a cryptographically secure nonce.

**Returns:** string - 32-character hex nonce

### authStore.ts

#### `linkBaseWallet(address, signature, message, nonce)`

Links a Base wallet to the current user's account.

#### `unlinkBaseWallet(walletAddress)`

Unlinks a Base wallet from the current user's account.

#### `fetchLinkedWallets()`

Fetches all wallets linked to the current user.

#### `setLinkedWallets(wallets)`

Sets the linked wallets in the store.

## Testing

### Manual Testing

1. **Link Wallet Flow:**
   - Sign in with Google
   - Navigate to wallet settings
   - Connect Coinbase Wallet
   - Sign SIWE message
   - Verify wallet appears in list

2. **Unlink Wallet Flow:**
   - Click unlink button on a wallet
   - Confirm action
   - Verify wallet is removed from list

3. **Edge Cases:**
   - Try linking same wallet twice (should fail)
   - Try linking wallet from different account (should fail)
   - Refresh page and verify wallets persist

### Automated Testing

```typescript
// Example test case
describe('Base Wallet Integration', () => {
  it('should link a wallet successfully', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const nonce = generateNonce();
    const message = await generateSiweMessage(address, nonce);

    // Mock signature
    const signature = '0x...';

    const result = await verifyWalletSignature({
      message,
      signature,
      address,
      nonce,
      userId: 'test-user-id',
    });

    expect(result.success).toBe(true);
  });
});
```

## Future Enhancements

- [ ] Support multiple wallet types (Ethereum, Polygon, etc.)
- [ ] Add wallet-based authentication (sign in with wallet directly)
- [ ] Implement token-gated features
- [ ] Add on-chain verification for premium features
- [ ] Support hardware wallets (Ledger, Trezor)
- [ ] Add multi-sig wallet support
- [ ] Implement wallet-based session management

## Resources

- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [Base Documentation](https://docs.base.org)
- [Wagmi Documentation](https://wagmi.sh)
- [WalletConnect Documentation](https://docs.walletconnect.com)
- [Coinbase Wallet SDK](https://docs.cloud.coinbase.com/wallet-sdk/docs)

## Support

For issues or questions:
- Create an issue on GitHub
- Join our Discord community
- Check existing documentation

## License

This integration is part of TarotForge and follows the same license.
