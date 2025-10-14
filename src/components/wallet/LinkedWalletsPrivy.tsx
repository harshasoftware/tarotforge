import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Wallet, Trash2, Plus, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

interface LinkedWallet {
  id: string;
  wallet_address: string;
  wallet_type: string;
  chain_type?: string;
  linked_at: string;
  is_primary: boolean;
}

export const LinkedWalletsPrivy: React.FC = () => {
  const { linkWallet, unlinkWallet, exportWallet, user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const user = useAuthStore((state) => state.user);

  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLinkedWallets();
    }
  }, [user, wallets.length]);

  const fetchLinkedWallets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('linked_at', { ascending: false });

      if (error) throw error;

      setLinkedWallets(data || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkWallet = async () => {
    try {
      await linkWallet();
      toast.success('Wallet linked successfully!');
      await fetchLinkedWallets();
    } catch (error) {
      console.error('Error linking wallet:', error);
      toast.error('Failed to link wallet');
    }
  };

  const handleUnlinkWallet = async (walletAddress: string) => {
    if (
      !confirm(
        'Are you sure you want to unlink this wallet? You can always link it again later.'
      )
    ) {
      return;
    }

    try {
      await unlinkWallet(walletAddress);

      // Remove from Supabase
      if (user) {
        await supabase
          .from('user_wallets')
          .delete()
          .eq('user_id', user.id)
          .eq('wallet_address', walletAddress.toLowerCase());
      }

      toast.success('Wallet unlinked successfully');
      await fetchLinkedWallets();
    } catch (error) {
      console.error('Error unlinking wallet:', error);
      toast.error('Failed to unlink wallet');
    }
  };

  const handleExportWallet = async () => {
    try {
      await exportWallet();
      toast.success('Check your downloads for the wallet backup');
    } catch (error) {
      console.error('Error exporting wallet:', error);
      toast.error('Failed to export wallet');
    }
  };

  const getBlockExplorerUrl = (address: string, chainType?: string) => {
    if (chainType === 'solana') {
      return `https://solscan.io/account/${address}`;
    }
    // Default to Base for EVM chains
    return `https://basescan.org/address/${address}`;
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
            Connect your wallets for Web3 features
          </p>
        </div>

        <button
          onClick={handleLinkWallet}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Link Wallet
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading wallets...</p>
        </div>
      ) : linkedWallets.length === 0 ? (
        <div className="text-center p-8 bg-purple-900/10 rounded-lg border border-purple-500/20">
          <Wallet className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
          <p className="text-white/70 mb-4">No wallets linked yet</p>
          <button
            onClick={handleLinkWallet}
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
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm">
                      {wallet.wallet_address.slice(0, 6)}...
                      {wallet.wallet_address.slice(-4)}
                    </p>
                    {wallet.is_primary && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-white/50 text-xs">
                      {wallet.wallet_type || 'Unknown'}
                      {wallet.chain_type && ` • ${wallet.chain_type}`}
                    </p>
                    <a
                      href={getBlockExplorerUrl(wallet.wallet_address, wallet.chain_type)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
                    >
                      View on explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    Linked {new Date(wallet.linked_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUnlinkWallet(wallet.wallet_address)}
                className="text-red-400 hover:text-red-300 transition-colors p-2"
                title="Unlink wallet"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Embedded Wallet Features */}
      {privyUser?.wallet && (
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 mt-6">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            Embedded Wallet Features
          </h4>
          <p className="text-white/60 text-sm mb-4">
            Your embedded wallet is automatically created and secured by Privy
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExportWallet}
              className="text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 py-2 px-4 rounded-lg transition-colors"
            >
              Export Wallet
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-blue-300 font-semibold mb-2 text-sm">
          Why link wallets?
        </h4>
        <ul className="text-blue-200/70 text-xs space-y-1">
          <li>• Access NFT tarot decks</li>
          <li>• Participate in token-gated readings</li>
          <li>• List and rent your NFT collections</li>
          <li>• Join exclusive holder communities</li>
        </ul>
      </div>
    </div>
  );
};
