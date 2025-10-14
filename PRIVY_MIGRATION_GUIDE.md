# Privy Migration Guide

## Step 1: Install Dependencies

```bash
npm install @privy-io/react-auth @privy-io/server-auth
```

## Step 2: Get Privy App ID

1. Go to https://dashboard.privy.io
2. Create a new app or use existing
3. Copy your App ID
4. Add to `.env`:

```env
VITE_PRIVY_APP_ID=your_app_id_here
```

## Step 3: Configure Privy in Dashboard

### Authentication Methods
Enable in Privy Dashboard:
- ✅ Google OAuth
- ✅ Email (Magic Link)
- ✅ Wallet (MetaMask, Coinbase Wallet, WalletConnect)
- ✅ Embedded Wallets

### Supported Chains
Enable:
- Base (Chain ID: 8453)
- Ethereum (Chain ID: 1)
- Solana

### Redirect URIs
Add your domains:
- `http://localhost:5173` (development)
- `https://tarotforge.xyz` (production)

## Step 4: Remove Old Implementation

The following files can be REMOVED (old Base SDK implementation):
- `src/lib/baseWalletAuth.ts`
- `src/lib/wagmiConfig.ts`
- `src/components/wallet/LinkBaseWallet.tsx`
- `src/components/wallet/SignInWithWallet.tsx`
- `src/components/providers/WagmiProvider.tsx`
- `src/types/viem.d.ts`

## Step 5: Update Dependencies

Remove from package.json:
```json
{
  "siwe": "^3.0.0",
  "viem": "^2.38.0",
  "wagmi": "^2.18.0",
  "@rainbow-me/rainbowkit": "^2.2.8",
  "@tanstack/react-query": "^5.90.2"
}
```

Keep these (needed for Privy):
```json
{
  "@privy-io/react-auth": "^latest",
  "@privy-io/server-auth": "^latest"
}
```

## Step 6: Implementation Files

I've created the following new files:
1. `src/components/providers/PrivyProvider.tsx` - Main Privy wrapper
2. `src/hooks/usePrivyAuth.ts` - Custom hook for Privy integration
3. `src/components/wallet/PrivyWalletButton.tsx` - Wallet connection button
4. `src/components/wallet/LinkedWalletsPrivy.tsx` - Wallet management UI

## Step 7: Update Main App

The main.tsx has been updated to use PrivyProvider instead of WagmiProvider.

## Step 8: Update authStore

The authStore has been updated with Privy integration methods.

## Step 9: Test

1. Start dev server: `npm run dev`
2. Go to `/login`
3. Test all auth methods:
   - Google OAuth
   - Email magic link
   - Wallet connection
4. Go to `/profile`
5. Test wallet linking/unlinking

## Benefits Over Previous Implementation

### Privy Advantages:
✅ **Unified SDK** - One library for Web2 + Web3
✅ **Better UX** - Polished built-in modals
✅ **Embedded Wallets** - Users get wallets automatically
✅ **Multi-chain** - Solana, Base, Ethereum out of the box
✅ **Email Recovery** - Wallet recovery via email
✅ **MFA Support** - Optional 2FA
✅ **Better Mobile** - Native mobile wallet support
✅ **No Extra Config** - Less code, less configuration

### vs Old Implementation:
- **Before**: wagmi + viem + SIWE + custom components = ~2000 lines
- **After**: Privy = ~500 lines

## Migration Checklist

- [ ] Install Privy dependencies
- [ ] Get Privy App ID from dashboard
- [ ] Add VITE_PRIVY_APP_ID to .env
- [ ] Configure auth methods in Privy dashboard
- [ ] Remove old Base SDK files
- [ ] Test Google OAuth login
- [ ] Test email magic link
- [ ] Test wallet connection
- [ ] Test wallet linking on profile
- [ ] Update database migration (already compatible)
- [ ] Deploy to production

## Troubleshooting

### "Privy App ID not found"
- Make sure `VITE_PRIVY_APP_ID` is set in .env
- Restart dev server after adding env var

### "Authentication method not enabled"
- Check Privy dashboard settings
- Make sure Google/Email/Wallet are enabled

### "Redirect URI mismatch"
- Add your domain to Privy dashboard
- Match exactly (http vs https)

### Database migration
- The existing `user_wallets` table works with Privy
- No schema changes needed
- Privy wallet addresses are stored the same way

## Support

- Privy Docs: https://docs.privy.io
- Privy Discord: https://discord.gg/privy
- GitHub Issues: Create issue with `[Privy]` tag
