# Phase 4: Database Schema Migration

## Migration File Created

**File:** `supabase/migrations/20250115000000_add_privy_auth_columns.sql`

This migration adds the following columns to support Privy authentication:

### Users Table Additions:

| Column | Type | Description |
|--------|------|-------------|
| `privy_id` | TEXT UNIQUE | Privy user ID (unique identifier from Privy) |
| `embedded_eth_wallet` | TEXT | Privy embedded Ethereum/Base wallet address |
| `embedded_solana_wallet` | TEXT | Privy embedded Solana wallet address |
| `external_wallets` | JSONB | Array of linked external wallets (MetaMask, Phantom, etc.) |
| `auth_method` | TEXT | Primary authentication method (email, google, wallet, twitter) |
| `full_name` | TEXT | Full name from OAuth providers or user input |

### Anonymous Users Table Additions:

| Column | Type | Description |
|--------|------|-------------|
| `name` | TEXT | Display name for guest users |

### Indexes:

- `idx_users_privy_id` - Index on `privy_id` for fast lookups

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended for Hosted Projects)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20250115000000_add_privy_auth_columns.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Supabase CLI (For Linked Projects)

If you have your Supabase project linked locally:

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push
```

### Option 3: Manual SQL Execution

Connect to your Supabase database and run:

```sql
-- Add Privy-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS embedded_eth_wallet TEXT,
ADD COLUMN IF NOT EXISTS embedded_solana_wallet TEXT,
ADD COLUMN IF NOT EXISTS external_wallets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Create index on privy_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id);

-- Add name column to anonymous_users for guest display names
ALTER TABLE anonymous_users
ADD COLUMN IF NOT EXISTS name TEXT;
```

## TypeScript Interface Updated

The `User` interface in `src/types/index.ts` has been updated to include:

```typescript
export interface User {
  // ... existing fields ...

  // Privy authentication fields
  privy_id?: string;
  embedded_eth_wallet?: string;
  embedded_solana_wallet?: string;
  external_wallets?: Array<{
    address: string;
    type: 'ethereum' | 'solana';
    walletClient: string;
  }>;
  auth_method?: 'email' | 'google' | 'wallet' | 'twitter';
}
```

## Privy Sync Logic Updated

**File:** `src/lib/privy.ts`

The following functions have been updated to sync wallet data:

### `convertPrivyUserToTarotUser()`
- Now includes `privy_id` in the returned user object
- Extracts embedded Ethereum and Solana wallet addresses
- Maps external wallets (MetaMask, Phantom, etc.)
- Detects authentication method (email, google, wallet, twitter)

### `syncPrivyUserToSupabase()`
- Upserts user data with wallet information
- Syncs embedded wallets from Privy
- Stores external wallet connections
- Uses `privy_id` as the unique identifier for upserts

### `getUserWallets()`
- Extracts embedded Ethereum wallet
- Extracts embedded Solana wallet
- Returns array of external wallets

## Data Flow

```
┌─────────────┐
│ Privy Login │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ handlePrivyLogin()  │
│ (authStorePrivy.ts) │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│ convertPrivyUserToTarot  │
│ User(privyUser)          │
│ - Extract auth method    │
│ - Get wallet addresses   │
│ - Map external wallets   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ syncPrivyUserToSupabase  │
│ (privyUser)              │
│ - Upsert to users table  │
│ - Save embedded wallets  │
│ - Save external wallets  │
│ - Save auth method       │
└──────────────────────────┘
```

## Wallet Data Structure

### Embedded Wallets
Created automatically by Privy for all users:
- **Ethereum/Base:** `embedded_eth_wallet` column
- **Solana:** `embedded_solana_wallet` column

### External Wallets
User-connected wallets stored in `external_wallets` JSONB column:

```json
[
  {
    "address": "0x1234...",
    "type": "ethereum",
    "walletClient": "metamask"
  },
  {
    "address": "5678...",
    "type": "solana",
    "walletClient": "phantom"
  }
]
```

## Verification Steps

After running the migration, verify:

1. **Schema Changes:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'users'
   AND column_name IN (
     'privy_id',
     'embedded_eth_wallet',
     'embedded_solana_wallet',
     'external_wallets',
     'auth_method',
     'full_name'
   );
   ```

2. **Index Created:**
   ```sql
   SELECT indexname
   FROM pg_indexes
   WHERE tablename = 'users'
   AND indexname = 'idx_users_privy_id';
   ```

3. **Anonymous Users Name Column:**
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'anonymous_users'
   AND column_name = 'name';
   ```

## Next Steps

After running the migration:

1. ✅ Test user authentication with Privy
2. ✅ Verify wallet addresses are synced correctly
3. ✅ Check that external wallets are stored in JSONB
4. ✅ Confirm auth_method is set correctly
5. ✅ Move to Phase 5: Profile Page Wallet Management

## Rollback

If you need to rollback this migration:

```sql
-- Remove added columns from users table
ALTER TABLE users
DROP COLUMN IF EXISTS privy_id,
DROP COLUMN IF EXISTS embedded_eth_wallet,
DROP COLUMN IF EXISTS embedded_solana_wallet,
DROP COLUMN IF EXISTS external_wallets,
DROP COLUMN IF EXISTS auth_method,
DROP COLUMN IF EXISTS full_name;

-- Drop index
DROP INDEX IF EXISTS idx_users_privy_id;

-- Remove name column from anonymous_users
ALTER TABLE anonymous_users
DROP COLUMN IF EXISTS name;
```
