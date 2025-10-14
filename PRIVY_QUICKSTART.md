# Privy Integration - Quick Start Checklist

Follow these steps in order to migrate from Base SDK to Privy:

## ☐ Step 1: Install Dependencies (2 min)

```bash
npm install @privy-io/react-auth @privy-io/server-auth
```

## ☐ Step 2: Get Privy App ID (5 min)

1. Visit: https://dashboard.privy.io
2. Sign up or log in
3. Click "Create App"
4. Name it "TarotForge"
5. Copy your App ID

## ☐ Step 3: Add Environment Variable (1 min)

Add to `.env`:
```env
VITE_PRIVY_APP_ID=your_app_id_here
```

## ☐ Step 4: Configure Privy Dashboard (3 min)

In Privy Dashboard > Settings:

### Enable Login Methods:
- ✅ Google OAuth
- ✅ Email (magic link)
- ✅ Wallet (MetaMask, Coinbase, WalletConnect)
- ✅ Embedded Wallets

### Add Redirect URIs:
- `http://localhost:5173`
- `https://tarotforge.xyz`

### Select Chains:
- ✅ Base (8453)
- ✅ Ethereum (1)
- ✅ Solana

## ☐ Step 5: Update main.tsx (2 min)

**Find and replace:**
```tsx
// OLD:
import { WagmiProvider } from './components/providers/WagmiProvider';

<WagmiProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</WagmiProvider>
```

```tsx
// NEW:
import { PrivyProviderWrapper } from './components/providers/PrivyProviderWrapper';

<PrivyProviderWrapper>
  <AuthProvider>
    <App />
  </AuthProvider>
</PrivyProviderWrapper>
```

## ☐ Step 6: Update Login Page (5 min)

File: `src/pages/auth/Login.tsx`

**Add import:**
```tsx
import { usePrivy } from '@privy-io/react-auth';
```

**Add to component:**
```tsx
const { login } = usePrivy();
```

**Replace wallet sign-in button:**
```tsx
// OLD: Custom wallet modal
<button onClick={() => setShowWalletSignIn(true)}>
  Sign In with Wallet
</button>

// NEW: Privy unified login
<button onClick={login}>
  Sign In
</button>
```

**Remove:**
- Old wallet modal code
- `SignInWithWallet` component import
- `showWalletSignIn` state

## ☐ Step 7: Update Profile Page (2 min)

File: `src/pages/user/Profile.tsx`

**Replace import:**
```tsx
// OLD:
import { LinkedWallets } from '../../components/wallet/LinkedWallets';

// NEW:
import { LinkedWalletsPrivy } from '../../components/wallet/LinkedWalletsPrivy';
```

**Replace component:**
```tsx
// OLD:
<LinkedWallets />

// NEW:
<LinkedWalletsPrivy />
```

## ☐ Step 8: Database Migration (2 min)

Run in Supabase SQL Editor:

```sql
-- Add privy_id to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE;

-- Add chain_type to user_wallets table
ALTER TABLE public.user_wallets
ADD COLUMN IF NOT EXISTS chain_type TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON public.users(privy_id);
```

## ☐ Step 9: Clean Up Old Files (5 min)

### Delete these files:
```bash
rm src/lib/baseWalletAuth.ts
rm src/lib/wagmiConfig.ts
rm src/components/wallet/LinkBaseWallet.tsx
rm src/components/wallet/SignInWithWallet.tsx
rm src/components/wallet/LinkedWallets.tsx
rm src/components/providers/WagmiProvider.tsx
rm src/types/viem.d.ts
```

### Remove from package.json dependencies:
- `siwe`
- `viem`
- `wagmi`
- `@rainbow-me/rainbowkit`

Then run:
```bash
npm install
```

## ☐ Step 10: Test Everything (10 min)

### Test 1: Google OAuth
```
1. npm run dev
2. Go to /login
3. Click "Sign In"
4. Choose "Social" tab
5. Click Google
6. ✅ Should sign in
```

### Test 2: Email Magic Link
```
1. Go to /login
2. Click "Sign In"
3. Choose "Email" tab
4. Enter your email
5. Check inbox
6. ✅ Click link, should sign in
```

### Test 3: Wallet Connection
```
1. Go to /login
2. Click "Sign In"
3. Choose "Wallet" tab
4. Connect MetaMask/Coinbase
5. ✅ Should sign in
```

### Test 4: Wallet Linking
```
1. Sign in with Google
2. Go to /profile
3. Scroll to "Linked Wallets"
4. Click "Link Wallet"
5. Connect a wallet
6. ✅ Should show in list
```

### Test 5: Wallet Unlinking
```
1. In profile, find linked wallet
2. Click trash icon
3. Confirm
4. ✅ Should remove from list
```

## ✅ Done!

If all tests pass, you're successfully migrated to Privy! 🎉

## 🆘 Having Issues?

### Issue: "Privy App ID not found"
**Fix:** Restart dev server after adding env var

### Issue: "Authentication method not enabled"
**Fix:** Enable in Privy dashboard settings

### Issue: "Redirect URI mismatch"
**Fix:** Add exact URL to Privy dashboard

### Issue: Database errors
**Fix:** Make sure migration SQL ran successfully

### Issue: npm install fails
**Fix:** Delete `node_modules` and `package-lock.json`, then `npm install`

## 📊 Quick Comparison

| Feature | Before (Base SDK) | After (Privy) |
|---------|------------------|---------------|
| Code | ~2000 lines | ~500 lines |
| Dependencies | 5+ packages | 2 packages |
| Auth Methods | Separate flows | Unified modal |
| Mobile Support | Manual setup | Auto |
| Recovery | Custom | Built-in |
| Setup Time | 2-3 hours | 30 minutes |

## 🎯 What Changed?

### Removed:
- ❌ Custom SIWE implementation
- ❌ wagmi configuration
- ❌ Manual wallet connectors
- ❌ Custom auth modals
- ❌ Separate sign-in flows

### Added:
- ✅ Privy unified authentication
- ✅ Automatic embedded wallets
- ✅ Email recovery for wallets
- ✅ Better mobile support
- ✅ Simpler codebase

## 📚 Next Steps

Once everything works:
1. Test on production
2. Monitor analytics
3. Check user feedback
4. Explore Privy features:
   - MFA (Multi-Factor Auth)
   - Custom branding
   - Cross-app login
   - Advanced analytics

## 🚀 You're Ready!

Your Tarot Forge app now has:
- ✅ Google OAuth
- ✅ Email magic links
- ✅ Wallet connection
- ✅ Multi-wallet support
- ✅ Embedded wallets
- ✅ Email recovery

All in one simple, unified experience! 🎉

---

**Total Time:** ~35 minutes
**Difficulty:** Easy
**Support:** Check PRIVY_IMPLEMENTATION_SUMMARY.md for details
