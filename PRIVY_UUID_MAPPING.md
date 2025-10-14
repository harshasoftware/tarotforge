# Privy DID to UUID Mapping Solution

## Problem

Privy uses **DID (Decentralized Identifier)** format for user IDs:
```
did:privy:cmgqa53xd00coju0cirwf9j7y
```

However, the Tarot Forge database uses **UUID** format for all user_id foreign keys:
```
550e8400-e29b-41d4-a716-446655440000
```

This incompatibility causes database errors when trying to query by `creator_id`, `user_id`, etc.

## Solution: UUID Mapping Table

Instead of changing all database columns from UUID to TEXT, we created a **mapping table** that links Privy DIDs to UUIDs.

### Architecture

```
┌─────────────────┐
│  Privy Login    │
│  did:privy:xxx  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  privy_user_mapping table       │
│  ┌───────────────────────────┐  │
│  │ privy_did | uuid          │  │
│  │ did:...   | 550e8400-...  │  │
│  └───────────────────────────┘  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  All other tables use UUID      │
│  - users(id: UUID)              │
│  - decks(creator_id: UUID)      │
│  - readings(user_id: UUID)      │
│  - etc.                         │
└─────────────────────────────────┘
```

## Database Changes

### Migration File
**File:** `supabase/migrations/20250115000002_create_privy_user_mapping.sql`

### New Table: `privy_user_mapping`

| Column | Type | Description |
|--------|------|-------------|
| `uuid` | UUID (PK) | UUID used throughout database |
| `privy_did` | TEXT (UNIQUE) | Privy DID (did:privy:...) |
| `created_at` | TIMESTAMPTZ | When mapping was created |
| `updated_at` | TIMESTAMPTZ | Last update time |

### Database Functions

#### `get_or_create_uuid_for_privy_did(p_privy_did TEXT)`
**Returns:** UUID

Gets existing UUID for a Privy DID, or creates a new mapping if it doesn't exist.

```sql
SELECT get_or_create_uuid_for_privy_did('did:privy:cmgqa53xd00coju0cirwf9j7y');
-- Returns: 550e8400-e29b-41d4-a716-446655440000
```

#### `get_privy_did_from_uuid(p_uuid UUID)`
**Returns:** TEXT

Reverse lookup: gets Privy DID from UUID.

```sql
SELECT get_privy_did_from_uuid('550e8400-e29b-41d4-a716-446655440000');
-- Returns: did:privy:cmgqa53xd00coju0cirwf9j7y
```

## Code Changes

### File: `src/lib/privy.ts`

#### Updated: `convertPrivyUserToTarotUser()`

```typescript
// Step 1: Get or create UUID for Privy DID
const { data: uuidData } = await supabase
  .rpc('get_or_create_uuid_for_privy_did', { p_privy_did: privyUser.id });

const userUuid = uuidData as string;

// Step 2: Check if user exists using UUID
const { data: existingUser } = await supabase
  .from('users')
  .select('*')
  .eq('id', userUuid)
  .single();

// Step 3: Return user with UUID as id
return {
  id: userUuid, // UUID, not Privy DID
  privy_id: privyUser.id, // Store Privy DID for reference
  // ... other fields
};
```

#### Updated: `syncPrivyUserToSupabase()`

```typescript
// Step 1: Get or create UUID mapping
const { data: uuidData } = await supabase
  .rpc('get_or_create_uuid_for_privy_did', { p_privy_did: privyUser.id });

const userUuid = uuidData as string;
console.log(`✅ Mapped Privy DID ${privyUser.id} to UUID ${userUuid}`);

// Step 2: Upsert user with UUID
await supabase
  .from('users')
  .upsert({
    id: userUuid, // Use UUID, not Privy DID
    privy_id: privyUser.id, // Store Privy DID for reference
    // ... other fields
  }, {
    onConflict: 'id', // Conflict on UUID primary key
  });
```

## Data Flow

### 1. User Logs In with Privy

```
User clicks "Sign in with Google"
  ↓
Privy authenticates
  ↓
Returns privyUser with id: "did:privy:cmgqa53xd00coju0cirwf9j7y"
```

### 2. UUID Mapping

```
convertPrivyUserToTarotUser(privyUser)
  ↓
Call: get_or_create_uuid_for_privy_did("did:privy:cmgqa53xd00coju0cirwf9j7y")
  ↓
Returns: "550e8400-e29b-41d4-a716-446655440000"
  ↓
User object has id: "550e8400-e29b-41d4-a716-446655440000"
```

### 3. Database Operations

```
All queries use UUID:
  ↓
SELECT * FROM decks WHERE creator_id = '550e8400-e29b-41d4-a716-446655440000'
  ↓
✅ Works! UUID matches database schema
```

## Benefits

✅ **Backwards Compatible**
- Existing UUID-based queries still work
- No need to update all foreign key columns

✅ **Clean Separation**
- Privy DIDs only in mapping table
- UUIDs everywhere else in database

✅ **Easy Lookup**
- Fast bidirectional mapping
- Indexed for performance

✅ **Data Integrity**
- Foreign key constraints preserved
- CASCADE delete works correctly

✅ **Minimal Code Changes**
- Only 2 functions updated
- All other code uses UUID as before

## Migration Instructions

### Step 1: Run Migration

Execute the migration in Supabase SQL Editor:

```bash
# File: supabase/migrations/20250115000002_create_privy_user_mapping.sql
```

### Step 2: Verify Functions Created

```sql
-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'get_or_create_uuid_for_privy_did';

-- Test the function
SELECT get_or_create_uuid_for_privy_did('did:privy:test123');
```

### Step 3: Deploy Code

The updated `src/lib/privy.ts` is already in the codebase.

### Step 4: Test

1. Log in with Privy
2. Check logs for: `✅ Mapped Privy DID did:privy:xxx to UUID yyy`
3. Verify user record created with UUID
4. Verify queries work correctly

## Example Data

### Before (Error)

```sql
-- User ID from Privy
user_id = "did:privy:cmgqa53xd00coju0cirwf9j7y"

-- Query fails
SELECT * FROM decks WHERE creator_id = 'did:privy:cmgqa53xd00coju0cirwf9j7y'
-- Error: invalid input syntax for type uuid
```

### After (Success)

```sql
-- Mapping table
privy_user_mapping:
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ uuid                                 │ privy_did                            │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 550e8400-e29b-41d4-a716-446655440000 │ did:privy:cmgqa53xd00coju0cirwf9j7y │
└──────────────────────────────────────┴──────────────────────────────────────┘

-- Users table
users:
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ id (UUID)                            │ privy_id (TEXT)                      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 550e8400-e29b-41d4-a716-446655440000 │ did:privy:cmgqa53xd00coju0cirwf9j7y │
└──────────────────────────────────────┴──────────────────────────────────────┘

-- Query succeeds
SELECT * FROM decks WHERE creator_id = '550e8400-e29b-41d4-a716-446655440000'
-- ✅ Returns decks
```

## Performance Considerations

### Indexes
```sql
-- Fast lookup by Privy DID
CREATE INDEX idx_privy_user_mapping_privy_did ON privy_user_mapping(privy_did);

-- Fast lookup by UUID (primary key automatically indexed)
```

### Caching
The UUID mapping is called on every `convertPrivyUserToTarotUser()`. Consider caching in production:

```typescript
// Future optimization (not implemented yet)
const uuidCache = new Map<string, string>();

function getCachedUUID(privyDid: string): string | undefined {
  return uuidCache.get(privyDid);
}
```

## Rollback

If needed, to rollback this change:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS get_or_create_uuid_for_privy_did;
DROP FUNCTION IF EXISTS get_privy_did_from_uuid;

-- Drop table
DROP TABLE IF EXISTS privy_user_mapping;

-- Remove foreign key constraint on users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
```

## Future Enhancements

1. **Add caching** - Cache UUID mappings in memory
2. **Batch lookups** - Support multiple DIDs in one query
3. **Migration tool** - Migrate existing users to Privy
4. **Analytics** - Track Privy vs legacy users

## Status

✅ **Migration File Created**
⚠️ **Needs to be run** in Supabase dashboard
✅ **Code Updated** and deployed
✅ **Build Passes** (no TypeScript errors)
🧪 **Ready for Testing**

---

**Created:** January 15, 2025
**Status:** Ready to deploy
**Build:** ✅ Passing
