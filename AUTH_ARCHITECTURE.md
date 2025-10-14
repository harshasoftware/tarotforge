# Authentication Architecture - Supabase + Privy Hybrid

## 🏗️ System Overview

Tarot Forge uses a **hybrid authentication architecture** that combines the strengths of both Supabase and Privy:

```
┌─────────────────────────────────────────────────────────────┐
│                    Tarot Forge Application                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐   │
│  │   SUPABASE AUTH      │      │    PRIVY WALLETS     │   │
│  │   (Primary System)   │◄────►│   (Web3 Layer)       │   │
│  │                      │      │                      │   │
│  │  • User Accounts     │      │  • Wallet Connect    │   │
│  │  • Google OAuth      │      │  • Multi-Chain       │   │
│  │  • Magic Links       │      │  • Ethereum          │   │
│  │  • User Profiles     │      │  • Solana            │   │
│  │  • Database          │      │  • Base Network      │   │
│  └──────────────────────┘      └──────────────────────┘   │
│           │                              │                 │
│           │    Auto-Linking via Hook     │                 │
│           └──────────────┬───────────────┘                 │
│                          │                                 │
│                  ┌───────▼────────┐                        │
│                  │  useHybridAuth │                        │
│                  │  Hook          │                        │
│                  └────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Design Philosophy

### Why This Architecture?

**Supabase as Primary Auth:**
- ✅ Handles user accounts, profiles, and data
- ✅ Provides email/password and OAuth
- ✅ Built-in database and RLS
- ✅ Your existing system (no breaking changes)

**Privy for Wallet Connectivity:**
- ✅ Specialized in Web3 wallet UX
- ✅ Multi-chain support (ETH, SOL, Base)
- ✅ Embedded wallets for users without wallets
- ✅ Handles wallet signatures securely

**Best of Both Worlds:**
- 🎨 Users sign in with familiar methods (Google, Email)
- 🔗 Optionally connect wallets for NFT features
- 🚀 Progressive enhancement (Web2 → Web3)
- 🔒 Security through separation of concerns

## 📊 Authentication Flow Details

### Flow 1: Standard Web2 Authentication

```
User clicks "Sign In"
    │
    ├─→ Option 1: Google OAuth
    │       └─→ Supabase handles OAuth
    │           └─→ User account created
    │               └─→ User is authenticated
    │
    └─→ Option 2: Email Magic Link
            └─→ Supabase sends magic link
                └─→ User clicks link
                    └─→ User is authenticated
```

**Technical Flow:**
1. User interacts with `SignInModal`
2. `useAuthStore` handles Supabase authentication
3. User profile created in `users` table
4. Session established
5. User redirected to dashboard

### Flow 2: Wallet Connection (New!)

```
User clicks "Connect Wallet"
    │
    └─→ Privy modal opens
        └─→ User selects wallet (MetaMask, Phantom, etc.)
            └─→ Wallet connection approved
                └─→ Privy authentication complete
                    └─→ Auto-linking triggers
                        ├─→ IF Supabase user exists
                        │   └─→ Link wallet to existing account
                        │       └─→ Update wallet_addresses in DB
                        │           └─→ Enable NFT features
                        │
                        └─→ IF no Supabase user
                            └─→ Create Supabase account
                                └─→ Link wallet immediately
                                    └─→ Enable NFT features
```

**Technical Flow:**
1. User clicks wallet button in `SignInModal`
2. `useHybridAuth.connectWallet()` calls Privy
3. Privy handles wallet connection
4. `useEffect` in `useHybridAuth` detects both auth systems
5. Auto-linking updates Supabase user record
6. User now has both Web2 account + Web3 wallet

### Flow 3: Hybrid User (Web2 + Web3)

```
Authenticated User State:
    │
    ├─→ Supabase Session Active
    │   └─→ User ID, email, profile
    │
    └─→ Privy Wallet Connected
        └─→ Wallet addresses, chain info
            │
            └─→ Linked in Database
                └─→ wallet_addresses: { ethereum: "0x...", solana: "..." }
                └─→ privy_user_id: "privy-user-id"
                └─→ nft_features_enabled: true
```

## 🔐 Security Model

### Supabase Security (Unchanged)
- **RLS Policies**: Control data access per user
- **JWT Tokens**: Secure session management
- **OAuth Providers**: Trusted authentication

### Privy Security (New)
- **Wallet Signatures**: Cryptographic proof of ownership
- **Non-Custodial**: Users control private keys
- **Multi-Chain**: Separate addresses per chain

### Linking Security
- **One-Way Hash**: Privy user ID stored in Supabase
- **User Consent**: Manual linking or auto-linking on first connect
- **Revocable**: Users can disconnect wallets anytime

## 💾 Database Schema

### Users Table Structure

```sql
CREATE TABLE users (
  -- Existing Supabase fields
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP,

  -- Web3 Integration Fields (NEW)
  wallet_addresses JSONB DEFAULT '{}',
  privy_user_id TEXT,
  nft_features_enabled BOOLEAN DEFAULT FALSE,

  -- Indexes for performance
  CONSTRAINT unique_privy_user_id UNIQUE (privy_user_id)
);

-- Example wallet_addresses data
{
  "ethereum": "0x742d35Cc6634C0532925a3b8D4e5a2cBb3B8E5A3",
  "solana": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5pTHW6",
  "base": "0x742d35Cc6634C0532925a3b8D4e5a2cBb3B8E5A3"
}
```

## 🔧 Component Integration

### SignInModal
**Location**: `src/components/auth/SignInModal.tsx`

**Purpose**: Primary authentication UI

**Integrations**:
- ✅ Supabase Auth (Google, Email) - `useAuthStore`
- ✅ Privy Wallet Connection - `useHybridAuth`

**Button Order** (by design):
1. **Google OAuth** - Most familiar, highest conversion
2. **Connect Wallet** - New Web3 users, mystical gradient styling
3. **Email Magic Link** - Fallback for users without Google

### useHybridAuth Hook
**Location**: `src/hooks/useHybridAuth.ts`

**Purpose**: Bridge between Supabase and Privy

**Key Features**:
- Combines auth state from both systems
- Auto-linking when both are authenticated
- Provides unified `canAccessNFTFeatures` flag
- Handles wallet connection/disconnection

**State Provided**:
```typescript
{
  supabaseUser,           // Supabase user object
  isSupabaseAuthenticated, // true if logged in (not anonymous)
  privyUser,              // Privy user object
  walletAddress,          // Primary wallet address
  isWalletConnected,      // true if wallet connected
  canAccessNFTFeatures,   // true if both Supabase + Privy
  hasWallet,              // true if any wallet connected

  // Methods
  connectWallet(),        // Open Privy wallet modal
  linkWalletToAccount(),  // Manually link wallet
  disconnectWallet()      // Disconnect Privy wallet
}
```

## 🎨 User Experience

### For Web2 Users (Traditional)
1. Sign in with Google or Email
2. Access all standard features
3. **Optional**: See `WalletEnhancementModal` suggesting NFT features
4. Can skip and connect wallet later

### For Web3 Users (Crypto Native)
1. Click "Connect Wallet" directly
2. Approve wallet connection
3. Supabase account auto-created
4. Immediate access to all features (Web2 + Web3)

### For Hybrid Users (Both)
1. Sign in with Web2 method (Google/Email)
2. Connect wallet for NFT features
3. Auto-linking happens transparently
4. Full access to all features

## 🚦 Feature Gating

### Access Control Pattern

```typescript
import { useHybridAuth } from '@/hooks/useHybridAuth';

function NFTFeature() {
  const { canAccessNFTFeatures, connectWallet } = useHybridAuth();

  // Gate 1: Check combined auth status
  if (!canAccessNFTFeatures) {
    return (
      <div>
        <p>Connect your wallet to access NFT features</p>
        <button onClick={connectWallet}>Connect Wallet</button>
      </div>
    );
  }

  // Gate 2: Check specific NFT ownership (your logic)
  const hasNFT = checkUserOwnsNFT();
  if (!hasNFT) {
    return <p>This feature requires a specific NFT</p>;
  }

  // User has both wallet + required NFT
  return <PremiumNFTFeature />;
}
```

## 🔄 State Synchronization

### Auto-Linking Logic

The `useHybridAuth` hook includes an `useEffect` that automatically links wallets:

```typescript
useEffect(() => {
  // Triggers when:
  // 1. User authenticates with Supabase
  // 2. User connects wallet via Privy
  // 3. Wallet not yet linked to account

  if (supabaseUser && privyUser && !supabaseUser.wallet_addresses) {
    linkWalletToAccount(); // Automatic linking
  }
}, [supabaseUser, privyUser]);
```

**Why Auto-Link?**
- ✅ Seamless UX - no extra steps
- ✅ Immediate NFT feature access
- ✅ Persistent wallet connection
- ✅ Can still manually disconnect

## 🧪 Testing Different Scenarios

### Scenario 1: Web2 Only User
```bash
# Test Steps:
1. Sign in with Google
2. Do NOT connect wallet
3. Navigate to NFT marketplace
4. Should see: "Connect Wallet" prompt
5. Standard features work normally
```

### Scenario 2: Web3 Only User
```bash
# Test Steps:
1. Click "Connect Wallet" (no other auth)
2. Approve MetaMask connection
3. Check database: user record created
4. All features should work
5. Can add email later if needed
```

### Scenario 3: Hybrid User
```bash
# Test Steps:
1. Sign in with Email
2. Connect wallet via button
3. Auto-linking occurs
4. Check database: wallet_addresses populated
5. NFT features unlocked
6. Refresh page - should stay connected
```

## 📈 Monitoring & Analytics

### Key Metrics to Track

**Adoption Metrics**:
```sql
-- Wallet adoption rate
SELECT
  COUNT(*) FILTER (WHERE nft_features_enabled) * 100.0 / COUNT(*) as adoption_rate
FROM users
WHERE email IS NOT NULL;

-- Most popular chains
SELECT
  jsonb_object_keys(wallet_addresses) as chain,
  COUNT(*) as user_count
FROM users
WHERE wallet_addresses != '{}'::jsonb
GROUP BY chain;
```

**User Segments**:
- Web2 Only: `supabaseUser && !walletAddress`
- Web3 Only: `walletAddress && !email` (rare)
- Hybrid: `supabaseUser && walletAddress`

## 🎯 Next Steps

### Immediate Actions
1. ✅ Apply database migration
2. ✅ Test all auth flows
3. ✅ Monitor auto-linking

### Future Enhancements
1. **Session Management**: Sync Privy session with Supabase
2. **Multi-Device**: Handle wallet on mobile, Web2 on desktop
3. **Social Recovery**: Use Privy's social recovery features
4. **Account Abstraction**: Implement smart contract wallets

## 🔍 Troubleshooting

### Issue: Auto-linking not working
**Check**:
1. Both `supabaseUser` and `privyUser` are defined
2. `wallet_addresses` field exists in database
3. No RLS policy blocking updates

### Issue: User disconnects wallet but NFT features still enabled
**Expected**: `nft_features_enabled` persists
**Why**: User may reconnect same wallet later
**To change**: Update on disconnect in `disconnectWallet()`

### Issue: Wallet connected but features not accessible
**Check**:
1. `canAccessNFTFeatures` flag
2. Database `nft_features_enabled` column
3. Both auth systems show authenticated

## 📚 References

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Privy Docs**: https://docs.privy.io/
- **Multi-Chain Support**: https://docs.privy.io/guide/guides/wallets
- **Security Best Practices**: https://docs.privy.io/guide/security

---

**Architecture designed for**: Progressive enhancement, user flexibility, and maximum security.
