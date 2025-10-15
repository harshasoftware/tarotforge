# Wallet Connection Troubleshooting & Backfill Guide

## Issues Fixed ✅

### 1. ~~Solana Wallet Connector Warning~~
**Issue:** Console warning about missing Solana connectors
```
App configuration has Solana wallet login enabled, but no Solana wallet connectors have been passed to Privy
```

**Fix Applied:**
- ✅ Added `@privy-io/react-auth/solana` import in [`privy-config.ts`](src/lib/privy-config.ts#L9)
- ✅ Configured `toSolanaWalletConnectors()` with auto-connect
- ✅ Added to `externalWallets.solana.connectors` config

### 2. ~~External Wallet Not Showing in UI~~
**Issue:** Connected external wallets showed success toast but didn't appear in UI

**Fixes Applied:**
- ✅ Fixed database column name (`chain` → `chain_type`)
- ✅ Fixed conflict key in upsert operation
- ✅ Added wallet list display in ConnectExternalWallet component
- ✅ Added sync toast notification when wallets are stored
- ✅ Added real-time tracking of connected wallets via Privy hooks

### 3. ~~Existing Users Have No Embedded Wallets~~
**Issue:** Users who signed up before Privy integration don't have embedded wallets

**Fix Applied:**
- ✅ Created `walletBackfill.ts` utility for creating wallets
- ✅ Added automatic backfill on user login in `authStore.ts`
- ✅ Silent, non-blocking background process

---

## How Wallet Creation Works Now

### For New Users (After Privy Integration)
1. User signs up via email/Google
2. `authStore.signUp()` automatically calls `privyService.createSilentWallet()`
3. Solana + Base wallets created immediately
4. Stored in `user_wallets` table with `is_visible_to_user: false`
5. User sees **NO Web3 terminology** (invisible Web3)

### For Existing Users (Before Privy Integration)
1. User logs in (email/Google)
2. `authStore.checkAuth()` runs during session check
3. Detects user has no embedded wallets
4. **Automatically calls `ensureUserHasEmbeddedWallets()`** in background
5. Creates Solana + Base wallets silently
6. User can now reveal wallets in Profile

---

## Automatic Backfill (Implemented)

The system now **automatically creates wallets for existing users** when they log in.

### How It Works:
```typescript
// In authStore.ts (line 286-297)
if (sessionUser.email) {
  (async () => {
    try {
      const { ensureUserHasEmbeddedWallets } = await import('../utils/walletBackfill');
      await ensureUserHasEmbeddedWallets(sessionUser.id, sessionUser.email!);
    } catch (error) {
      console.error('❌ Wallet backfill failed (non-blocking):', error);
    }
  })();
}
```

### What Happens:
1. ✅ Checks if user already has embedded wallets
2. ✅ If not, creates Solana + Base wallets via Privy
3. ✅ Stores in `user_identity_mapping` table
4. ✅ Stores in `user_wallets` table with `is_visible_to_user: false`
5. ✅ Silent and non-blocking (doesn't affect login flow)
6. ✅ Logs success/failure to console

### Result:
- **Existing users** get wallets automatically on next login
- **New users** get wallets on signup
- **All users** can reveal wallets in Profile page

---

## Manual Backfill (Optional)

If you want to create wallets for **all existing users at once** (instead of waiting for them to log in), use the manual backfill utility.

### Check Backfill Status

```typescript
import { getBackfillStatus } from './utils/walletBackfill';

const status = await getBackfillStatus();
console.log(status);
// {
//   totalUsers: 100,
//   usersWithWallets: 25,
//   usersWithoutWallets: 75,
//   percentComplete: 25.00
// }
```

### Run Manual Backfill (Use Carefully!)

```typescript
import { backfillAllUsers } from './utils/walletBackfill';

// WARNING: This will create wallets for ALL users
// Only run this during maintenance windows
const results = await backfillAllUsers();

// Results show success/failure for each user
console.log(results);
```

**⚠️ Important Notes:**
- This is rate-limited (10 users per batch, 2s delay between batches)
- Run during low-traffic periods
- Monitor console logs for errors
- Failed users will be retried on their next login anyway

### Create Wallet for Specific User

```typescript
import { createEmbeddedWalletsForUser } from './utils/walletBackfill';

const result = await createEmbeddedWalletsForUser(
  'user-uuid-here',
  'user@example.com'
);

console.log(result);
// {
//   userId: 'user-uuid-here',
//   success: true,
//   walletsCreated: 2, // Solana + Base
//   error: undefined
// }
```

---

## How to Test

### 1. Test Automatic Backfill (Existing User)
1. Sign out of your account
2. Sign back in with email or Google
3. Check browser console for:
   ```
   🔐 Creating embedded wallets for user: <user-id>
   ✅ Wallets created: { solana: '...', base: '...' }
   ✅ 2 wallets stored successfully
   ```
4. Go to Profile page → Scroll to "Wallet Settings"
5. You should see "Reveal Wallets" button
6. Click it → Wallet addresses appear!

### 2. Test External Wallet Connection
1. Install Phantom wallet (Solana) or MetaMask (Ethereum/Base)
2. Go to Profile → Wallet Settings
3. Click "Connect Wallet"
4. Select wallet from Privy modal
5. Approve connection in wallet extension
6. Check console for:
   ```
   1 wallet synced successfully!
   ```
7. See connected wallet appear in "Connected External Wallets" list

### 3. Test Progressive Revelation
1. New user signs up (or existing user logs in after backfill)
2. Profile page shows "Wallet Settings" section
3. WalletDashboard shows: "You have 2 blockchain wallets ready to use"
4. Click "Reveal Wallets"
5. Database updated: `is_visible_to_user: true`
6. Wallet addresses now visible with copy/explorer links

---

## Troubleshooting

### "No wallets showing even after backfill"

**Possible causes:**
1. Backfill failed silently → Check console logs
2. Database insert failed → Check Supabase logs
3. Privy service error → Check `privyService.ts` logs

**Solution:**
```typescript
// Manually check if user has wallets
const { data } = await supabase
  .from('user_wallets')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_embedded', true);

console.log('Embedded wallets:', data);
```

### "External wallet connects but doesn't show"

**Possible causes:**
1. Database sync failed
2. Privy user object not updated
3. Component not re-rendering

**Solution:**
- Refresh the page after connecting
- Check `user_wallets` table in Supabase for the address
- Check console for sync errors

### "Wallet connection modal doesn't open"

**Possible causes:**
1. Privy not ready
2. Missing wallet extension
3. Popup blocker

**Solution:**
- Wait for `ready: true` from `usePrivy()` hook
- Install wallet extension (Phantom/MetaMask)
- Check browser popup settings

---

## Database Schema Reference

### `user_wallets` Table
```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  wallet_address TEXT NOT NULL,
  chain_type TEXT NOT NULL, -- 'solana' | 'base' | 'ethereum'
  privy_did TEXT,
  is_embedded BOOLEAN DEFAULT false,
  is_visible_to_user BOOLEAN DEFAULT false, -- Progressive revelation
  provider TEXT DEFAULT 'external', -- 'privy_embedded' | 'external'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);
```

### `user_identity_mapping` Table
```sql
CREATE TABLE user_identity_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id),
  privy_did TEXT NOT NULL UNIQUE,
  wallet_solana TEXT,
  wallet_base TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## File Changes Summary

### Created Files:
- [`src/utils/walletBackfill.ts`](src/utils/walletBackfill.ts) - Backfill utility
- This documentation file

### Modified Files:
- [`src/lib/privy-config.ts`](src/lib/privy-config.ts) - Added Solana connectors
- [`src/components/wallet/ConnectExternalWallet.tsx`](src/components/wallet/ConnectExternalWallet.tsx) - Fixed database sync
- [`src/stores/authStore.ts`](src/stores/authStore.ts) - Added automatic backfill on login

---

## Next Steps

### For You (Now):
1. ✅ External wallet connection should work
2. ✅ Log in to trigger automatic wallet creation
3. ✅ Check Profile → Wallet Settings
4. ✅ Click "Reveal Wallets" to see your addresses

### For Production (Later):
1. Monitor backfill success rate in logs
2. Check Supabase `user_wallets` table growth
3. Optionally run `backfillAllUsers()` during maintenance
4. Monitor Privy dashboard for wallet creation stats

---

## Support & Resources

- **Privy Docs:** https://docs.privy.io
- **Supabase Logs:** Check your Supabase dashboard
- **Console Logs:** Look for 🔐, ✅, ❌ emojis for wallet operations
- **Database:** Check `user_wallets` and `user_identity_mapping` tables

---

## FAQ

**Q: When do existing users get wallets?**
A: Automatically on their next login (or manually via backfill utility)

**Q: Do new users get wallets automatically?**
A: Yes! Created silently during signup

**Q: Can users see their wallets immediately?**
A: No, they must click "Reveal Wallets" in Profile (progressive revelation)

**Q: What if wallet creation fails?**
A: It's non-blocking - user can still use the app. Will retry on next login.

**Q: Can users have multiple wallets?**
A: Yes! Embedded wallets (Solana + Base) + any external wallets they connect

**Q: How do I know if backfill is working?**
A: Check browser console for 🔐 emoji logs when you log in

---

**All issues should now be resolved!** 🎉

Try logging in again and check your Profile page → Wallet Settings section.
