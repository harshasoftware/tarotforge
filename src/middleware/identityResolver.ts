/**
 * Identity Resolver Middleware
 *
 * Provides fast bidirectional resolution between:
 * - Privy DID ↔ Supabase UUID
 * - Wallet Address ↔ Supabase UUID
 *
 * This middleware ensures all app logic continues using Supabase UUIDs
 * while supporting Web3 identity behind the scenes.
 */

import { supabase } from '../lib/supabase';

/**
 * Cache for identity mappings to reduce database queries
 * Format: Map<key, {value, timestamp}>
 */
const identityCache = new Map<
  string,
  { value: string | null; timestamp: number }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of identityCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      identityCache.delete(key);
    }
  }
}

/**
 * Get from cache if available and not expired
 */
function getFromCache(key: string): string | null | undefined {
  clearExpiredCache();
  const cached = identityCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  return undefined;
}

/**
 * Set cache entry
 */
function setCache(key: string, value: string | null): void {
  identityCache.set(key, { value, timestamp: Date.now() });
}

/**
 * Resolve Supabase UUID from Privy DID
 *
 * @param privyDID - Privy DID (did:privy:xxxxx)
 * @returns Supabase user UUID or null if not found
 */
export async function resolveUUIDFromPrivyDID(
  privyDID: string
): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `did:${privyDID}`;
    const cached = getFromCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Query database
    const { data, error } = await supabase
      .from('user_identity_mapping')
      .select('supabase_user_id')
      .eq('privy_did', privyDID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error resolving UUID from Privy DID:', error);
      return null;
    }

    const result = data?.supabase_user_id || null;

    // Cache result
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in resolveUUIDFromPrivyDID:', error);
    return null;
  }
}

/**
 * Resolve Privy DID from Supabase UUID
 *
 * @param userUUID - Supabase user UUID
 * @returns Privy DID or null if user doesn't have one
 */
export async function resolvePrivyDIDFromUUID(
  userUUID: string
): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `uuid:${userUUID}`;
    const cached = getFromCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Query database
    const { data, error } = await supabase
      .from('user_identity_mapping')
      .select('privy_did')
      .eq('supabase_user_id', userUUID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error resolving Privy DID from UUID:', error);
      return null;
    }

    const result = data?.privy_did || null;

    // Cache result
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in resolvePrivyDIDFromUUID:', error);
    return null;
  }
}

/**
 * Resolve Supabase UUID from wallet address (any chain)
 *
 * @param walletAddress - Wallet address (Solana or Base/Ethereum format)
 * @returns Supabase user UUID or null if not found
 */
export async function resolveUUIDFromWallet(
  walletAddress: string
): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `wallet:${walletAddress}`;
    const cached = getFromCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Query database (check both Solana and Base columns)
    const { data, error } = await supabase
      .from('user_identity_mapping')
      .select('supabase_user_id')
      .or(`wallet_solana.eq.${walletAddress},wallet_base.eq.${walletAddress}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error resolving UUID from wallet:', error);
      return null;
    }

    const result = data?.supabase_user_id || null;

    // Cache result
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in resolveUUIDFromWallet:', error);
    return null;
  }
}

/**
 * Get all wallet addresses for a user
 *
 * @param userUUID - Supabase user UUID
 * @returns Object with Solana and Base addresses
 */
export async function getUserWallets(userUUID: string): Promise<{
  solana: string | null;
  base: string | null;
  privyDID: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('user_identity_mapping')
      .select('wallet_solana, wallet_base, privy_did')
      .eq('supabase_user_id', userUUID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user wallets:', error);
      return { solana: null, base: null, privyDID: null };
    }

    return {
      solana: data?.wallet_solana || null,
      base: data?.wallet_base || null,
      privyDID: data?.privy_did || null,
    };
  } catch (error) {
    console.error('Error in getUserWallets:', error);
    return { solana: null, base: null, privyDID: null };
  }
}

/**
 * Check if user has embedded wallet
 *
 * @param userUUID - Supabase user UUID
 * @returns True if user has at least one embedded wallet
 */
export async function userHasEmbeddedWallet(
  userUUID: string
): Promise<boolean> {
  try {
    const wallets = await getUserWallets(userUUID);
    return !!(wallets.solana || wallets.base);
  } catch (error) {
    console.error('Error checking embedded wallet:', error);
    return false;
  }
}

/**
 * Check if user is Web3-aware (has seen wallet in UI)
 *
 * @param userUUID - Supabase user UUID
 * @returns True if user has been shown their wallet
 */
export async function isUserWeb3Aware(userUUID: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('user_id', userUUID)
      .eq('is_visible_to_user', true)
      .limit(1);

    if (error) {
      console.error('Error checking Web3 awareness:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error in isUserWeb3Aware:', error);
    return false;
  }
}

/**
 * Resolve identifier to UUID
 * Accepts: UUID, Privy DID, or wallet address
 * Returns: Supabase UUID
 *
 * @param identifier - UUID, DID, or wallet address
 * @returns Supabase user UUID or null
 */
export async function resolveIdentifier(
  identifier: string
): Promise<string | null> {
  // Check if already a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(identifier)) {
    return identifier;
  }

  // Check if Privy DID (format: did:privy:xxxxx)
  if (identifier.startsWith('did:privy:')) {
    return await resolveUUIDFromPrivyDID(identifier);
  }

  // Otherwise, assume wallet address
  return await resolveUUIDFromWallet(identifier);
}

/**
 * Clear identity cache
 * Useful after updates to identity mappings
 */
export function clearIdentityCache(): void {
  identityCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  clearExpiredCache();
  return {
    size: identityCache.size,
    entries: Array.from(identityCache.keys()),
  };
}
