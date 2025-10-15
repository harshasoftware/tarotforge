/**
 * Wallet Backfill Utility
 *
 * Creates embedded wallets for existing users who signed up before
 * the Privy integration was implemented.
 *
 * This utility can be run:
 * 1. Automatically on user login
 * 2. Manually via admin panel
 * 3. As a one-time migration script
 */

import { supabase } from '../lib/supabase';
import { privyService } from '../services/privyService';

interface BackfillResult {
  userId: string;
  success: boolean;
  walletsCreated: number;
  error?: string;
}

// Track users currently being processed to prevent duplicate calls
const processingUsers = new Set<string>();

/**
 * Check if user already has embedded wallets
 */
export async function userHasEmbeddedWallets(userId: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if user has embedded wallets:', userId);
    const { data, error } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_embedded', true)
      .limit(1);

    if (error) {
      console.error('❌ Error checking for embedded wallets:', error);
      return false;
    }

    const hasWallets = (data && data.length > 0);
    console.log(hasWallets ? '✅ User has embedded wallets' : '⚠️ User does NOT have embedded wallets');
    return hasWallets;
  } catch (error) {
    console.error('❌ Error in userHasEmbeddedWallets:', error);
    return false;
  }
}

/**
 * Create embedded wallets for a single user
 */
export async function createEmbeddedWalletsForUser(
  userId: string,
  userEmail: string
): Promise<BackfillResult> {
  try {
    console.log(`🔐 Creating embedded wallets for user: ${userId}`);

    // Check if user already has embedded wallets
    const hasWallets = await userHasEmbeddedWallets(userId);
    if (hasWallets) {
      console.log(`✅ User ${userId} already has embedded wallets`);
      return {
        userId,
        success: true,
        walletsCreated: 0,
        error: 'User already has embedded wallets'
      };
    }

    // Create silent wallet via Privy service
    const walletInfo = await privyService.createSilentWallet(userId, userEmail);

    console.log('✅ Wallets created:', {
      solana: walletInfo.solanaAddress,
      base: walletInfo.baseAddress
    });

    // Store in identity mapping table
    const { error: mappingError } = await supabase
      .from('user_identity_mapping')
      .insert({
        supabase_user_id: userId,
        privy_did: walletInfo.privyDID,
        wallet_solana: walletInfo.solanaAddress,
        wallet_base: walletInfo.baseAddress
      });

    if (mappingError && mappingError.code !== '23505') { // Ignore duplicate key errors
      console.error('⚠️ Failed to store identity mapping:', mappingError);
    }

    // Store in user_wallets table (both Solana and Base)
    const walletsToInsert = [];

    if (walletInfo.solanaAddress) {
      walletsToInsert.push({
        user_id: userId,
        wallet_address: walletInfo.solanaAddress,
        chain_type: 'solana',
        privy_did: walletInfo.privyDID,
        is_embedded: true,
        is_visible_to_user: false, // Hidden by default (progressive revelation)
        provider: 'privy_embedded'
      });
    }

    if (walletInfo.baseAddress) {
      walletsToInsert.push({
        user_id: userId,
        wallet_address: walletInfo.baseAddress,
        chain_type: 'base',
        privy_did: walletInfo.privyDID,
        is_embedded: true,
        is_visible_to_user: false,
        provider: 'privy_embedded'
      });
    }

    let walletsCreated = 0;
    if (walletsToInsert.length > 0) {
      const { error: walletsError } = await supabase
        .from('user_wallets')
        .insert(walletsToInsert);

      if (walletsError) {
        console.error('⚠️ Failed to store wallets:', walletsError);
        throw walletsError;
      } else {
        walletsCreated = walletsToInsert.length;
        console.log(`✅ ${walletsCreated} wallets stored successfully`);
      }
    }

    return {
      userId,
      success: true,
      walletsCreated,
    };
  } catch (error: any) {
    console.error('❌ Failed to create embedded wallets for user:', error);
    return {
      userId,
      success: false,
      walletsCreated: 0,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Auto-create wallets for current user on login (if they don't have any)
 * This is the main function to call when a user signs in
 */
export async function ensureUserHasEmbeddedWallets(
  userId: string,
  userEmail: string
): Promise<boolean> {
  // Prevent concurrent calls for same user
  if (processingUsers.has(userId)) {
    console.log('⏭️ Wallet creation already in progress for user, skipping...');
    return true; // Return true to avoid blocking
  }

  try {
    processingUsers.add(userId);

    // Check if user already has embedded wallets
    const hasWallets = await userHasEmbeddedWallets(userId);
    if (hasWallets) {
      console.log('✅ User already has wallets, no action needed');
      return true; // User already has wallets, nothing to do
    }

    // Create wallets
    console.log('👤 User does not have embedded wallets, creating...');
    const result = await createEmbeddedWalletsForUser(userId, userEmail);

    if (result.success) {
      console.log(`✅ Successfully created ${result.walletsCreated} wallets for user`);
      return true;
    } else {
      console.error(`❌ Failed to create wallets: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error in ensureUserHasEmbeddedWallets:', error);
    return false;
  } finally {
    // Always remove from processing set
    processingUsers.delete(userId);
  }
}

/**
 * Backfill wallets for all existing users (admin function)
 * WARNING: This should be run carefully, preferably with rate limiting
 */
export async function backfillAllUsers(): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];

  try {
    // Get all users from Supabase auth
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return results;
    }

    if (!users || users.length === 0) {
      console.log('No users found to backfill');
      return results;
    }

    console.log(`📊 Found ${users.length} users, starting backfill...`);

    // Process users in batches to avoid rate limits
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(user =>
          createEmbeddedWalletsForUser(user.id, user.email || '')
        )
      );

      results.push(...batchResults);

      // Delay between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalWallets = results.reduce((sum, r) => sum + r.walletsCreated, 0);

    console.log(`
📊 Backfill Summary:
- Total users processed: ${results.length}
- Successful: ${successful}
- Failed: ${failed}
- Total wallets created: ${totalWallets}
    `);

    return results;
  } catch (error) {
    console.error('Error in backfillAllUsers:', error);
    return results;
  }
}

/**
 * Get wallet backfill status for dashboard
 */
export async function getBackfillStatus(): Promise<{
  totalUsers: number;
  usersWithWallets: number;
  usersWithoutWallets: number;
  percentComplete: number;
}> {
  try {
    // Get total user count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get users with embedded wallets count
    const { data: usersWithWallets } = await supabase
      .from('user_wallets')
      .select('user_id')
      .eq('is_embedded', true);

    const uniqueUsersWithWallets = new Set(usersWithWallets?.map(w => w.user_id) || []).size;
    const usersWithoutWallets = (totalUsers || 0) - uniqueUsersWithWallets;
    const percentComplete = totalUsers ? (uniqueUsersWithWallets / totalUsers) * 100 : 0;

    return {
      totalUsers: totalUsers || 0,
      usersWithWallets: uniqueUsersWithWallets,
      usersWithoutWallets,
      percentComplete: Math.round(percentComplete * 100) / 100
    };
  } catch (error) {
    console.error('Error getting backfill status:', error);
    return {
      totalUsers: 0,
      usersWithWallets: 0,
      usersWithoutWallets: 0,
      percentComplete: 0
    };
  }
}
