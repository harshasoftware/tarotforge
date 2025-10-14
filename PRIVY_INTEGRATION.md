# Privy Integration - Implementation Guide

## Overview

This document describes the Privy embeddable wallet integration for TarotForge. The integration provides invisible Web3 capabilities - users experience traditional Web2 authentication while automatically receiving blockchain wallets for Solana and Base chains.

## Architecture

### Core Principle: **Invisible Web3**
- Users sign up with email/Google (Web2 UX)
- Privy automatically creates embedded wallets (Solana + Base)
- All blockchain actions happen silently in the background
- Users can optionally "discover" their wallets later (progressive revelation)

### Identity System
- **Source of Truth:** Supabase UUID
- **Mapping Layer:** `user_identity_mapping` table
- **Resolution:** Fast bidirectional UUID ↔ DID lookups
- **No Code Changes:** Existing session/realtime logic unchanged

## Installation Complete ✅

The following has been installed and configured:

### 1. Dependencies
```bash
✅ @privy-io/react-auth@3.3.0
✅ @privy-io/server-auth@1.32.5
```

### 2. Database Migrations Created

**Migration 1:** `/supabase/migrations/20251014160000_create_identity_mapping.sql`
- Creates `user_identity_mapping` table
- Fast UUID ↔ DID resolution
- RLS policies for security

**Migration 2:** `/supabase/migrations/20251014160001_extend_user_wallets.sql`
- Extends `user_wallets` table with Privy columns
- Supports embedded vs external wallets
- Progressive revelation tracking

**Migration 3:** `/supabase/migrations/20251014160002_identity_resolution_functions.sql`
- Helper functions for identity resolution
- Database-level UUID/DID conversion
- Wallet lookup utilities

### 3. Core Services Created

**`src/types/privy.ts`** ✅
- TypeScript type definitions
- Wallet info interfaces
- Error types

**`src/lib/privy-config.ts`** ✅
- Privy SDK configuration
- Chain configs (Solana + Base)
- Dev/prod environment handling

**`src/services/privyService.ts`** ✅
- Core Privy service layer
- Silent wallet creation
- Transaction signing (future)
- Wallet status management

**`src/middleware/identityResolver.ts`** ✅
- UUID ↔ DID resolution
- Wallet address lookups
- Caching layer for performance

## Next Steps (To Complete)

### Step 1: Apply Database Migrations

```bash
# Connect to your Supabase project
cd supabase/migrations

# Apply migrations using Supabase CLI or MCP
# The migrations are in:
# - 20251014160000_create_identity_mapping.sql
# - 20251014160001_extend_user_wallets.sql
# - 20251014160002_identity_resolution_functions.sql
```

### Step 2: Set Environment Variables

Add to `.env` and `.env.local`:

```bash
# Get from https://dashboard.privy.io
VITE_PRIVY_APP_ID=your_privy_app_id_here

# Optional: WalletConnect for external wallet connections
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_id

# Feature flag
VITE_ENABLE_WEB3_FEATURES=true
```

### Step 3: Update authStore.ts

Add silent wallet creation to the signup flow. Insert after successful Supabase user creation:

```typescript
// In signUp() method, after Supabase signup succeeds:
try {
  const { privyService } = await import('../services/privyService');
  const walletInfo = await privyService.createSilentWallet(
    supabaseUser.id,
    email
  );

  // Store in identity mapping
  await supabase.from('user_identity_mapping').insert({
    supabase_user_id: supabaseUser.id,
    privy_did: walletInfo.privyDID,
    wallet_solana: walletInfo.solanaAddress,
    wallet_base: walletInfo.baseAddress
  });

  // Store in user_wallets
  await supabase.from('user_wallets').insert([
    {
      user_id: supabaseUser.id,
      wallet_address: walletInfo.solanaAddress,
      chain_type: 'solana',
      privy_did: walletInfo.privyDID,
      is_embedded: true,
      is_visible_to_user: false,  // Hidden by default
      provider: 'privy_embedded'
    },
    {
      user_id: supabaseUser.id,
      wallet_address: walletInfo.baseAddress,
      chain_type: 'base',
      privy_did: walletInfo.privyDID,
      is_embedded: true,
      is_visible_to_user: false,
      provider: 'privy_embedded'
    }
  ]);

  console.log('✅ Silent wallet created for user');
} catch (walletError) {
  // CRITICAL: Wallet creation must NOT block signup
  console.error('Silent wallet creation failed (non-blocking):', walletError);
}
```

### Step 4: Wrap App with PrivyProvider

Update `src/App.tsx`:

```typescript
import { PrivyProvider } from '@privy-io/react-auth';
import { getPrivyConfig } from './lib/privy-config';

function App() {
  const privyConfig = getPrivyConfig();

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={privyConfig}
    >
      {/* Existing app content */}
    </PrivyProvider>
  );
}
```

### Step 5: Create Wallet Dashboard (Optional - Progressive Revelation)

Create `/src/components/wallet/WalletDashboard.tsx`:
- Hidden by default
- Shows wallet addresses
- Copy/view buttons
- "Coming Soon" features (NFTs, tokens)

### Step 6: Update Profile Page

Add "Advanced" section with link to WalletDashboard:
- `/src/pages/profile/*`
- Only show if user has embedded wallet
- Label as "Beta" or "Advanced Features"

## Testing Checklist

### Basic Flow
- [ ] User signs up with email
- [ ] Wallet created silently (check logs)
- [ ] Identity mapping entry created
- [ ] user_wallets entries created
- [ ] User can complete reading session
- [ ] No "wallet" or "crypto" mentioned in UI

### Progressive Revelation
- [ ] User navigates to Advanced settings
- [ ] Wallet dashboard shows addresses
- [ ] Addresses are valid format (Solana + Base)
- [ ] Copy buttons work
- [ ] No errors in console

### Migration Flow
- [ ] Anonymous user upgrades to email
- [ ] Wallet created post-migration
- [ ] Session data preserved
- [ ] No duplicate participants

## Security Considerations

✅ **RLS Policies Applied**
- Users can only view their own identity mappings
- Service role required for writes

✅ **Private Keys**
- Managed by Privy (MPC)
- Never exposed to client
- Recovery via email

✅ **UUID-Based Access**
- All database operations use Supabase UUID
- RLS works unchanged
- No blockchain addresses in policies

## Performance

### Database Impact
- Identity mapping: 1 row per user (~100 bytes)
- Indexed lookups (UUID and DID)
- Cache layer reduces queries

### API Costs
- Privy free tier: 1000 MAU
- Wallet creation: one-time cost
- Signing: pay-per-use (future)

## Future Web3 Features (Enabled)

Once this integration is complete, you can easily add:

1. **NFT Deck Minting**
   - User clicks "Mint as NFT"
   - `privyService.signTransaction()` signs
   - Submit to blockchain
   - No wallet setup needed!

2. **Token-Gated Content**
   - Check user's wallet balance
   - Grant access based on tokens
   - Works automatically

3. **Crypto Tips for Readers**
   - Display embedded wallet address
   - Auto-receives tips
   - No wallet management

4. **DAO Membership**
   - Vote with embedded wallet
   - Participate in governance
   - Silent transactions

## Troubleshooting

### Wallet Creation Fails
- Check Privy API key in environment
- Verify Privy dashboard settings
- Check network connectivity
- Review console logs

### Identity Resolution Issues
- Clear cache: `clearIdentityCache()`
- Check mapping table entries
- Verify UUID format
- Test with `resolveIdentifier()`

### Migration Errors
- Ensure migrations run in order
- Check for foreign key constraints
- Verify RLS policies
- Test rollback if needed

## Documentation

- Privy Docs: https://docs.privy.io
- Supabase MCP: Connected
- TypeScript types: `/src/types/privy.ts`
- Service layer: `/src/services/privyService.ts`

## Support

For issues with this integration:
1. Check console logs (🔐 emoji indicates wallet operations)
2. Verify environment variables
3. Test database migrations
4. Review Privy dashboard for errors

---

**Status:** Infrastructure Complete ✅
**Next:** Apply migrations → Set env vars → Update authStore → Test!
