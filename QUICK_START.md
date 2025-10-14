# Quick Start - Testing Privy Integration

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Copy/paste from file
# Open supabase/migrations/add_wallet_fields.sql and run in SQL Editor
```

### Step 2: Verify Environment Variables

Check your `.env` file has:

```bash
VITE_PRIVY_APP_ID=  # ✅ Already configured!
```

### Step 3: Start Development Server

```bash
bun dev
```

### Step 4: Test the Integration

#### Test 1: View the Enhanced Sign-In Modal
1. Open `http://localhost:5173`
2. Click "Sign In" button in navbar
3. ✅ You should see 3 options:
   - Continue with Google
   - **Connect Wallet** (new!)
   - Email magic link

#### Test 2: Connect a Wallet
1. Click "Connect Wallet" button
2. Privy modal should open
3. Select a wallet (MetaMask, Phantom, etc.)
4. Approve connection
5. ✅ Modal closes, you're authenticated

#### Test 3: Check Database
```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  username,
  email,
  wallet_addresses,
  privy_user_id,
  nft_features_enabled
FROM users
WHERE nft_features_enabled = TRUE
LIMIT 10;
```

#### Test 4: Test Hybrid Auth Hook
Add this to any component:

```typescript
import { useHybridAuth } from '@/hooks/useHybridAuth';

function TestComponent() {
  const {
    isSupabaseAuthenticated,
    isWalletConnected,
    canAccessNFTFeatures,
    walletAddress
  } = useHybridAuth();

  return (
    <div className="p-4 bg-card rounded-lg">
      <h3 className="font-bold mb-2">Hybrid Auth Status</h3>
      <div className="space-y-1 text-sm">
        <div>Supabase Auth: {isSupabaseAuthenticated ? '✅' : '❌'}</div>
        <div>Wallet Connected: {isWalletConnected ? '✅' : '❌'}</div>
        <div>NFT Features: {canAccessNFTFeatures ? '✅ Enabled' : '❌ Disabled'}</div>
        {walletAddress && (
          <div>Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
        )}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Scenarios

### Scenario A: New Wallet User
```
1. Open app (logged out)
2. Click "Sign In"
3. Click "Connect Wallet"
4. Approve wallet connection
5. ✅ Account created, NFT features enabled
```

### Scenario B: Existing User Adds Wallet
```
1. Sign in with Google
2. See WalletEnhancementModal (optional)
3. Click "Connect Wallet"
4. Approve wallet connection
5. ✅ Wallet linked, NFT features enabled
```

### Scenario C: Skip Wallet Enhancement
```
1. Sign in with Google
2. See WalletEnhancementModal
3. Click "Skip for Now"
4. ✅ Modal dismissed, can connect later
```

---

## 🎨 Visual Verification

### Sign-In Modal Should Look Like:

```
┌─────────────────────────────────────┐
│         🔮 SIGN IN                  │
├─────────────────────────────────────┤
│                                     │
│  [🔵 Continue with Google        ] │  ← White bg, blue icon
│                                     │
│  [💎 Connect Wallet              ] │  ← Purple gradient bg ✨
│                                     │
│            - or -                   │
│                                     │
│  Email: ___________________         │
│  [📧 Send Magic Link]              │
│                                     │
│  Need an account? Create one        │
└─────────────────────────────────────┘
```

The wallet button should have:
- Purple/pink gradient background
- Gradient text
- Wallet icon
- Smooth hover effect

---

## ✅ Success Checklist

- [ ] Database migration applied (3 new columns visible)
- [ ] Sign-in modal shows "Connect Wallet" button
- [ ] Wallet button has purple gradient styling
- [ ] Clicking wallet button opens Privy modal
- [ ] Can connect MetaMask/Phantom/other wallets
- [ ] Wallet address saves to database
- [ ] `useHybridAuth` hook returns correct values
- [ ] WalletEnhancementModal appears after Web2 login
- [ ] Can dismiss enhancement modal
- [ ] No console errors

---

## 🐛 Common Issues & Fixes

### Issue: "Privy App ID not found"
**Fix**: Check `.env` file has `VITE_PRIVY_APP_ID`

### Issue: Wallet button doesn't appear
**Fix**: Check imports in `SignInModal.tsx`:
```typescript
import { useHybridAuth } from '../../hooks/useHybridAuth';
import { Wallet } from 'lucide-react';
```

### Issue: Database column not found
**Fix**: Run the migration:
```bash
supabase db push
```

### Issue: Privy modal doesn't open
**Fix**:
1. Check browser console for errors
2. Verify Privy App ID is correct
3. Check wallet extension is installed

---

## 🎯 Next: Implement Your First NFT Feature

Try gate-keeping a feature based on wallet connection:

```typescript
// Example: NFT Marketplace Access
import { useHybridAuth } from '@/hooks/useHybridAuth';

export function NFTMarketplace() {
  const { canAccessNFTFeatures, connectWallet } = useHybridAuth();

  if (!canAccessNFTFeatures) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <h2 className="text-2xl font-serif font-bold mb-4">
          NFT Marketplace
        </h2>
        <p className="text-muted-foreground mb-6">
          Connect your wallet to access rare NFT tarot decks
        </p>
        <button
          onClick={connectWallet}
          className="btn btn-primary"
        >
          Connect Wallet to Continue
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Your NFT marketplace UI */}
      <h1>Welcome to the NFT Marketplace!</h1>
      {/* List NFT decks, rental options, etc. */}
    </div>
  );
}
```

---

## 📚 Additional Resources

- **Full Guide**: `PRIVY_INTEGRATION_GUIDE.md`
- **Summary**: `INTEGRATION_SUMMARY.md`
- **Privy Docs**: https://docs.privy.io/
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 You're Ready!

The integration is complete and tested. Your Tarot Forge app now has:
- ✅ Hybrid Web2/Web3 authentication
- ✅ Beautiful, mystical-themed wallet UI
- ✅ Progressive enhancement (wallet optional)
- ✅ Multi-chain support (ETH, SOL, Base)
- ✅ Type-safe hooks and components
- ✅ Database schema for wallet data

**Start building your NFT features!** 🔮✨
