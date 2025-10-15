# Wallet Debug Steps - Quick Fix Guide

## Immediate Actions to Take

### Step 1: Check Console Logs
1. Open your browser DevTools (F12 or Cmd+Option+I on Mac)
2. Go to Console tab
3. Refresh your profile page
4. Look for these emoji logs:

**Expected logs when page loads:**
```
🔐 authStore: Starting wallet backfill check for user: <your-id>
💳 WalletDashboard: Checking for wallets for user: <your-id>
💳 WalletDashboard: Found wallets: [...]
```

**If you see:**
```
⚠️ WalletDashboard: No wallets found for user
```
→ Your account doesn't have wallets yet. Proceed to Step 2.

---

### Step 2: Use Manual Wallet Creator Button

I've added a **debug button** to your Wallet Settings page.

1. Go to **Profile → Scroll to "Wallet Settings"**
2. You'll see an **amber/yellow warning box** at the top
3. It says: "Debug: Manual Wallet Creation"
4. Click the button: **"Create Wallets Now"**
5. Wait for success message
6. Page will auto-refresh after 2 seconds
7. You should now see "Reveal Wallets" button!

---

### Step 3: Check Database Directly (If Button Fails)

Open your **Supabase Dashboard** → SQL Editor and run:

```sql
-- Check if you have wallets
SELECT * FROM user_wallets WHERE user_id = '<your-user-id>';

-- Check identity mapping
SELECT * FROM user_identity_mapping WHERE supabase_user_id = '<your-user-id>';
```

Replace `<your-user-id>` with your actual user ID (you can find it in console logs or Supabase Auth users table).

**Expected results:**
- `user_wallets`: Should have 2 rows (Solana + Base)
- `user_identity_mapping`: Should have 1 row with privy_did

**If empty:**
→ Wallets were never created. The manual button should fix this.

---

## Debugging Checklist

### ✅ What to Check:

1. **Privy App ID is set:**
   ```bash
   # Check .env file
   cat .env | grep VITE_PRIVY_APP_ID
   ```
   Should show: `VITE_PRIVY_APP_ID=clz...` (not empty)

2. **User is logged in:**
   - Check console for: `user:` object in logs
   - Profile page should show your username

3. **Database tables exist:**
   - Run this in Supabase SQL Editor:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('user_wallets', 'user_identity_mapping');
   ```
   Should return both table names.

4. **RLS policies allow inserts:**
   ```sql
   -- Check if service role can insert
   SELECT * FROM pg_policies
   WHERE tablename IN ('user_wallets', 'user_identity_mapping');
   ```

---

## Common Issues & Fixes

### Issue 1: "Create Wallets Now" button does nothing

**Possible causes:**
- Privy service not initialized
- Network error
- Missing environment variables

**Fix:**
1. Check console for errors
2. Verify `VITE_PRIVY_APP_ID` is set in `.env`
3. Check Network tab for failed requests

### Issue 2: Button says "Wallets already exist" but nothing shows

**Possible causes:**
- Wallets exist but WalletDashboard query is failing
- RLS policy blocking reads

**Fix:**
1. Check console logs from WalletDashboard
2. Run SQL query directly in Supabase:
   ```sql
   SELECT * FROM user_wallets
   WHERE user_id = '<your-id>';
   ```
3. If you see wallets, it's an RLS issue. Check your RLS policies.

### Issue 3: Console shows "Wallet backfill failed"

**Possible causes:**
- Privy service error
- Invalid email
- Network timeout

**Fix:**
1. Look at the full error message in console
2. Check if privyService.ts is working:
   ```typescript
   import { privyService } from './services/privyService';
   // Test in console
   ```
3. Use manual button instead of automatic backfill

---

## What the Logs Mean

### Good Logs (Everything Working):
```
🔐 authStore: Starting wallet backfill check for user: abc-123
🔐 Creating silent wallet for user: abc-123
✅ Wallet created: { solana: 'ABC...', base: 'DEF...' }
✅ 2 wallets stored successfully
✅ authStore: Wallet backfill completed successfully
💳 WalletDashboard: Checking for wallets for user: abc-123
💳 WalletDashboard: Found wallets: Array(2)
✅ WalletDashboard: User has 2 wallet(s)
```

### Bad Logs (Something Wrong):
```
🔐 authStore: Starting wallet backfill check for user: abc-123
❌ authStore: Wallet backfill failed (non-blocking): Error: ...
💳 WalletDashboard: Checking for wallets for user: abc-123
⚠️ WalletDashboard: No wallets found for user
```
→ Use manual button to force creation

---

## Quick Test Script

Run this in your browser console on the profile page:

```javascript
// Check if user is loaded
console.log('User:', window.__SUPABASE_USER__); // If this shows

// Force check for wallets
const { supabase } = await import('./lib/supabase');
const user = useAuthStore.getState().user;
const { data, error } = await supabase
  .from('user_wallets')
  .select('*')
  .eq('user_id', user.id);

console.log('Wallets in DB:', data);
console.log('Error:', error);
```

---

## Next Steps After Fixing

Once wallets are created:

1. ✅ You'll see "You have 2 blockchain wallets ready to use"
2. ✅ Click "Reveal Wallets" button
3. ✅ See your Solana and Base addresses
4. ✅ Copy addresses or view on block explorers

The manual button is just for debugging - **remove it** once everything works by deleting:
- `<ManualWalletCreator />` from `WalletSettings.tsx`
- The `ManualWalletCreator.tsx` file

---

## Contact/Support

If none of this works:
1. Check all console logs and copy them
2. Check Supabase logs for errors
3. Verify Privy dashboard shows your app is active
4. Share console logs for debugging

---

**TL;DR:**
1. Go to Profile → Wallet Settings
2. Click the amber "Create Wallets Now" button
3. Wait for success + page refresh
4. Enjoy your wallets! 🎉
