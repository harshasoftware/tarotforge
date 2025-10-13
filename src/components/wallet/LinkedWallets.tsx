import React, { useEffect, useState } from 'react';
import { Wallet, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { LinkBaseWallet } from './LinkBaseWallet';
import toast from 'react-hot-toast';

export const LinkedWallets: React.FC = () => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkingWallet, setUnlinkingWallet] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const fetchLinkedWallets = useAuthStore((state) => state.fetchLinkedWallets);
  const unlinkBaseWallet = useAuthStore((state) => state.unlinkBaseWallet);

  useEffect(() => {
    if (user) {
      fetchLinkedWallets();
    }
  }, [user, fetchLinkedWallets]);

  const handleUnlinkWallet = async (walletAddress: string) => {
    if (
      !confirm(
        'Are you sure you want to unlink this wallet? You can always link it again later.'
      )
    ) {
      return;
    }

    setUnlinkingWallet(walletAddress);

    try {
      const result = await unlinkBaseWallet(walletAddress as `0x${string}`);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Wallet unlinked successfully');
    } catch (err) {
      console.error('Error unlinking wallet:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to unlink wallet'
      );
    } finally {
      setUnlinkingWallet(null);
    }
  };

  const handleLinkSuccess = () => {
    setShowLinkModal(false);
    fetchLinkedWallets();
  };

  if (!user) {
    return (
      <div className="text-center p-6 bg-purple-900/20 rounded-lg border border-purple-500/20">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-white/70">Please sign in to manage your wallets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Linked Wallets</h3>
          <p className="text-white/70 text-sm">
            Connect your Base wallet for enhanced Web3 features
          </p>
        </div>

        <button
          onClick={() => setShowLinkModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Link Wallet
        </button>
      </div>

      {linkedWallets.length === 0 ? (
        <div className="text-center p-8 bg-purple-900/10 rounded-lg border border-purple-500/20">
          <Wallet className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
          <p className="text-white/70 mb-4">No wallets linked yet</p>
          <button
            onClick={() => setShowLinkModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Link Your First Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedWallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-mono text-sm">
                    {wallet.wallet_address.slice(0, 6)}...
                    {wallet.wallet_address.slice(-4)}
                  </p>
                  <p className="text-white/50 text-xs">
                    Linked {new Date(wallet.linked_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUnlinkWallet(wallet.wallet_address)}
                disabled={unlinkingWallet === wallet.wallet_address}
                className="text-red-400 hover:text-red-300 disabled:text-red-400/50 disabled:cursor-not-allowed transition-colors p-2"
                title="Unlink wallet"
              >
                {unlinkingWallet === wallet.wallet_address ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link Wallet Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
            <LinkBaseWallet
              onSuccess={handleLinkSuccess}
              onCancel={() => setShowLinkModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
