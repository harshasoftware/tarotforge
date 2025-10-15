import React, { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { createEmbeddedWalletsForUser } from '../../utils/walletBackfill';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * ManualWalletCreator Component
 *
 * Debug component to manually trigger wallet creation for current user.
 * Use this if automatic backfill isn't working.
 */
const ManualWalletCreator: React.FC = () => {
  const { user } = useAuthStore();
  const [creating, setCreating] = useState(false);

  const handleCreateWallets = async () => {
    if (!user?.id || !user?.email) {
      showErrorToast('User not logged in');
      return;
    }

    try {
      setCreating(true);
      console.log('🔧 Manual wallet creation started for:', user.id);

      const result = await createEmbeddedWalletsForUser(user.id, user.email);

      if (result.success) {
        if (result.walletsCreated > 0) {
          showSuccessToast(`Created ${result.walletsCreated} wallets successfully!`);
          console.log('✅ Manual wallet creation succeeded:', result);

          // Reload page after 1.5 seconds to show wallets
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          // Wallets already exist - just refresh to show them
          showSuccessToast('Wallets found! Refreshing...');
          console.log('ℹ️ User already has wallets:', result);

          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        showErrorToast(`Failed: ${result.error || 'Unknown error'}`);
        console.error('❌ Manual wallet creation failed:', result);
      }
    } catch (error: any) {
      console.error('❌ Error creating wallets:', error);
      showErrorToast('Failed to create wallets: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Wallet className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-500 mb-2">
            Debug: Manual Wallet Creation
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            If you don't see the "Reveal Wallets" option below, click this button to manually create embedded wallets for your account.
          </p>
          <button
            onClick={handleCreateWallets}
            disabled={creating}
            className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Wallets...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Create Wallets Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualWalletCreator;
