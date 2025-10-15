import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Eye, EyeOff, Copy, Check, ExternalLink, Sparkles, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface WalletInfo {
  address: string;
  chain: string;
  isEmbedded: boolean;
  isVisible: boolean;
}

/**
 * WalletDashboard Component
 *
 * Progressive revelation wallet interface that's hidden by default.
 * Shows user's embedded Solana and Base wallets when they opt-in to view them.
 *
 * Features:
 * - Hidden by default (progressive revelation)
 * - Shows wallet addresses when user clicks "Reveal Wallets"
 * - Copy to clipboard functionality
 * - Links to block explorers
 * - Visual distinction for embedded vs external wallets
 */
const WalletDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [hasWallets, setHasWallets] = useState(false);

  // Check if user has embedded wallets
  useEffect(() => {
    const checkForWallets = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has any wallets (embedded or external)
        console.log('💳 WalletDashboard: Checking for wallets for user:', user.id);
        const { data, error } = await supabase
          .from('user_wallets')
          .select('wallet_address, chain_type, is_embedded, is_visible_to_user')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('❌ WalletDashboard: Error fetching wallets:', error);
          throw error;
        }

        console.log('💳 WalletDashboard: Found wallets:', data);

        if (data && data.length > 0) {
          console.log(`✅ WalletDashboard: User has ${data.length} wallet(s)`);
          setHasWallets(true);

          // Transform data to WalletInfo format
          const walletInfos: WalletInfo[] = data.map(w => ({
            address: w.wallet_address,
            chain: w.chain_type,
            isEmbedded: w.is_embedded,
            isVisible: w.is_visible_to_user
          }));

          setWallets(walletInfos);
        } else {
          console.log('⚠️ WalletDashboard: No wallets found for user');
          setHasWallets(false);
        }
      } catch (error) {
        console.error('❌ WalletDashboard: Error checking for wallets:', error);
        setHasWallets(false);
      } finally {
        setLoading(false);
      }
    };

    checkForWallets();
  }, [user?.id]);

  // Handle revealing wallets (progressive revelation)
  const handleRevealWallets = async () => {
    if (!user?.id) return;

    try {
      // Mark embedded wallets as visible to user
      const { error } = await supabase
        .from('user_wallets')
        .update({ is_visible_to_user: true })
        .eq('user_id', user.id)
        .eq('is_embedded', true);

      if (error) throw error;

      setRevealed(true);

      // Update local state
      setWallets(prev => prev.map(w => ({
        ...w,
        isVisible: true
      })));

      showSuccessToast('Wallets revealed! You can now use Web3 features.');
    } catch (error) {
      console.error('Error revealing wallets:', error);
      showErrorToast('Failed to reveal wallets. Please try again.');
    }
  };

  // Copy wallet address to clipboard
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      showSuccessToast('Address copied to clipboard!');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Error copying address:', error);
      showErrorToast('Failed to copy address.');
    }
  };

  // Get block explorer URL for address
  const getExplorerUrl = (address: string, chain: string): string => {
    if (chain === 'solana') {
      return `https://solscan.io/account/${address}`;
    } else if (chain === 'base') {
      return `https://basescan.org/address/${address}`;
    }
    return '#';
  };

  // Truncate wallet address for display
  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get chain display name and color
  const getChainInfo = (chain: string) => {
    if (chain === 'solana') {
      return {
        name: 'Solana',
        color: 'from-purple-500 to-indigo-500',
        textColor: 'text-purple-400'
      };
    } else if (chain === 'base') {
      return {
        name: 'Base',
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-blue-400'
      };
    }
    return {
      name: chain,
      color: 'from-gray-500 to-gray-600',
      textColor: 'text-gray-400'
    };
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // If no wallets exist, don't show anything (completely hidden)
  if (!hasWallets) {
    return null;
  }

  // Check if any wallet is already visible (user has previously revealed)
  const anyWalletVisible = wallets.some(w => w.isVisible);
  const shouldShowRevealed = revealed || anyWalletVisible;

  return (
    <motion.div
      className="bg-card rounded-xl border border-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Your Wallets</h3>
          </div>

          {!shouldShowRevealed && (
            <button
              onClick={handleRevealWallets}
              className="btn btn-sm btn-primary flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Reveal Wallets
            </button>
          )}
        </div>

        <AnimatePresence>
          {!shouldShowRevealed ? (
            // Hidden state - show teaser
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="bg-muted/10 rounded-lg p-6 border border-dashed border-border">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  You have {wallets.length} blockchain wallet{wallets.length !== 1 ? 's' : ''} ready to use
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Reveal Wallets" to access Web3 features like NFT minting and crypto tips
                </p>
              </div>
            </motion.div>
          ) : (
            // Revealed state - show wallets
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {wallets.map((wallet, index) => {
                const chainInfo = getChainInfo(wallet.chain);
                const isCopied = copiedAddress === wallet.address;

                return (
                  <motion.div
                    key={wallet.address}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-muted/5 rounded-lg border border-border p-4 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${chainInfo.color}`} />
                        <span className="font-medium">{chainInfo.name}</span>
                        {wallet.isEmbedded && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded">
                            <Sparkles className="h-3 w-3" />
                            Auto-created
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono bg-background px-3 py-2 rounded flex-1">
                        {truncateAddress(wallet.address)}
                      </code>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyAddress(wallet.address)}
                          className="p-2 hover:bg-muted/20 rounded transition-colors"
                          title="Copy address"
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        <a
                          href={getExplorerUrl(wallet.address, wallet.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-muted/20 rounded transition-colors"
                          title="View on explorer"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-primary">💡 Tip:</span> These wallets were automatically created for you.
                  You can now receive NFTs, tokens, and use blockchain features without any Web3 knowledge required.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default WalletDashboard;
