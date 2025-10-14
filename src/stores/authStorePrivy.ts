/**
 * Privy-powered Authentication Store for Tarot Forge
 *
 * This is the new auth store that uses Privy for authentication
 * while maintaining compatibility with existing Tarot Forge features.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { convertPrivyUserToTarotUser, syncPrivyUserToSupabase } from '../lib/privy';
import { setUserContext, clearUserContext } from '../utils/errorTracking';
import { identifyUser } from '../utils/analytics';
import { isGuestUser } from '../utils/anonymousAuthPrivy';
import type { User as PrivyUser } from '@privy-io/react-auth';

export type { User };

interface AuthStore {
  user: User | null;
  loading: boolean;
  showSignInModal: boolean;
  authStateDetermined: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setShowSignInModal: (show: boolean) => void;
  setAuthStateDetermined: (determined: boolean) => void;

  // Guest/Anonymous user methods
  isAnonymous: () => boolean;

  // Privy integration methods
  syncPrivyUser: (privyUser: PrivyUser) => Promise<void>;
  handlePrivyLogin: (privyUser: PrivyUser) => Promise<void>;
  handlePrivyLogout: () => Promise<void>;

  // Migration methods (keep for existing user data migration)
  migrateAnonymousUserData: (fromUserId: string, toUserId: string) => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    loading: true,
    showSignInModal: false,
    authStateDetermined: false,

    setUser: (user) => {
      set({ user });
      if (user) {
        setUserContext(user);
        identifyUser(user);
      } else {
        clearUserContext();
        identifyUser(null);
      }
    },

    setLoading: (loading) => set({ loading }),

    setAuthStateDetermined: (determined) => set({ authStateDetermined: determined }),

    setShowSignInModal: async (show) => {
      if (show) {
        // Log reading session state when modal is opened
        try {
          const readingSessionStore = (await import('./readingSessionStore')).useReadingSessionStore.getState();
          if (readingSessionStore.sessionState) {
            console.log(
              '🕵️‍♂️ authStore.setShowSignInModal(true): Pre-modal open check: shuffledDeck length:',
              readingSessionStore.sessionState.shuffledDeck?.length,
              'selectedCards length:',
              readingSessionStore.sessionState.selectedCards?.length,
              'readingStep:',
              readingSessionStore.sessionState.readingStep
            );
          } else {
            console.log('🕵️‍♂️ authStore.setShowSignInModal(true): Pre-modal open check: No active reading session state.');
          }
        } catch (e) {
          console.warn('Error accessing readingSessionStore in authStore.setShowSignInModal:', e);
        }
      }
      set({ showSignInModal: show });
    },

    /**
     * Check if current user is a guest/anonymous user
     */
    isAnonymous: () => {
      const { user } = get();
      return isGuestUser(user?.id);
    },

    /**
     * Sync Privy user data to Supabase and update local state
     */
    syncPrivyUser: async (privyUser: PrivyUser) => {
      try {
        console.log('🔄 Syncing Privy user to Supabase...');

        // Convert Privy user to Tarot user format
        const tarotUser = await convertPrivyUserToTarotUser(privyUser);

        // Sync to Supabase database
        await syncPrivyUserToSupabase(privyUser);

        // Update local state
        get().setUser(tarotUser);

        console.log('✅ Privy user synced successfully');
      } catch (error) {
        console.error('❌ Error syncing Privy user:', error);
      }
    },

    /**
     * Handle Privy login event
     */
    handlePrivyLogin: async (privyUser: PrivyUser) => {
      try {
        console.log('🔐 Handling Privy login...');
        set({ loading: true });

        // Sync user data to Supabase
        await get().syncPrivyUser(privyUser);

        // Close sign-in modal if open
        set({ showSignInModal: false, authStateDetermined: true });

        console.log('✅ Privy login handled successfully');
      } catch (error) {
        console.error('❌ Error handling Privy login:', error);
      } finally {
        set({ loading: false });
      }
    },

    /**
     * Handle Privy logout event
     */
    handlePrivyLogout: async () => {
      try {
        console.log('🚪 Handling Privy logout...');

        // Clear local user state
        get().setUser(null);

        // Clear any stored session context
        localStorage.removeItem('auth_session_context');
        localStorage.removeItem('auth_return_path');

        console.log('✅ Privy logout handled successfully');
      } catch (error) {
        console.error('❌ Error handling Privy logout:', error);
      }
    },

    /**
     * Migrate anonymous user data to authenticated user
     * (Keep this for existing anonymous users to upgrade)
     */
    migrateAnonymousUserData: async (fromUserId: string, toUserId: string) => {
      try {
        console.log('🔄 Migrating data from anonymous user to Privy user');
        console.log('From:', fromUserId, 'To:', toUserId);

        // Step 1: Migrate reading sessions
        const { error: sessionsError } = await supabase
          .from('reading_sessions')
          .update({
            host_user_id: toUserId,
            original_host_user_id: fromUserId
          })
          .eq('host_user_id', fromUserId);

        if (sessionsError) {
          console.warn('Could not migrate reading sessions:', sessionsError);
        } else {
          console.log('✅ Migrated reading sessions');
        }

        // Step 2: Migrate session participants
        const { data: anonymousParticipants, error: findError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('anonymous_id', fromUserId)
          .eq('is_active', true);

        if (findError) {
          console.warn('Could not find anonymous participants:', findError);
        } else if (anonymousParticipants && anonymousParticipants.length > 0) {
          console.log(`Found ${anonymousParticipants.length} anonymous participant records to migrate`);

          for (const participant of anonymousParticipants) {
            // Check if target user already has a participant in this session
            const { data: existingParticipant } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', participant.session_id)
              .eq('user_id', toUserId)
              .eq('is_active', true)
              .single();

            if (existingParticipant) {
              // Deactivate duplicate
              await supabase
                .from('session_participants')
                .update({ is_active: false })
                .eq('id', participant.id);
            } else {
              // Migrate participant
              await supabase
                .from('session_participants')
                .update({
                  user_id: toUserId,
                  anonymous_id: null,
                  is_host: participant.is_host
                })
                .eq('id', participant.id);
            }
          }
        }

        console.log('✅ Session participant migration complete');

        // Step 3: Migrate decks
        const { error: decksError } = await supabase
          .from('decks')
          .update({ creator_id: toUserId })
          .eq('creator_id', fromUserId);

        if (decksError) {
          console.warn('Could not migrate decks:', decksError);
        } else {
          console.log('✅ Migrated created decks');
        }

        // Step 4: Clean up anonymous user record
        const { error: cleanupError } = await supabase
          .from('anonymous_users')
          .delete()
          .eq('id', fromUserId);

        if (cleanupError) {
          console.warn('Could not clean up anonymous user record:', cleanupError);
        } else {
          console.log('✅ Cleaned up anonymous user record');
        }

        console.log('✅ Data migration completed successfully');
        return { error: null };
      } catch (error) {
        console.error('❌ Error migrating user data:', error);
        return { error };
      }
    },
  }))
);
