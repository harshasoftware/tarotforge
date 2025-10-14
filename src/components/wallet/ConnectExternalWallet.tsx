import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Link2, AlertCircle, Check, Loader2, ExternalLink } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * ConnectExternalWallet Component
 *
 * Allows users to connect external wallets (MetaMask, Phantom, etc.)
 * in addition to their auto-created embedded wallets.
 *
 * Features:
 * - Connect external Solana wallets (Phantom, Solflare, etc.)
 * - Connect external EVM wallets (MetaMask, etc.)
 * - Store external wallet addresses in user_wallets table
 * - Show connection status
 * - Disconnect functionality
 */
const ConnectExternalWallet: React.FC = () => {
  const { user } = useAuthStore();
  const { connectWallet, ready, user: privyUser, unlinkWallet } = usePrivy();
  const { wallets: solanaWallets, ready: solanaReady } = useWallets();
  const [connecting, setConnecting] = useState(false);
  const [connectedWallets, setConnectedWallets] = useState<Array<{ address: string; type: string; walletClientType?: string }>>([]);

  // Track connected external wallets from Privy
  useEffect(() => {
    if (privyUser && ready) {
      // Get all linked wallets (filter out embedded wallets, keep only external)
      const externalWallets = privyUser.linkedAccounts
        .filter((account) => {
          // Check if it's a wallet account
          if (account.type !== 'wallet') return false;

          // Filter out embedded wallets (keep only external wallets)
          const walletAccount = account as { walletClientType?: string };
          return walletAccount.walletClientType !== 'privy' && walletAccount.walletClientType !== 'privy-v2';
        })
        .map((account) => {
          const wallet = account as { address: string; chainType: string; walletClientType?: string };
          return {
            address: wallet.address,
            type: wallet.chainType || 'ethereum',
            walletClientType: wallet.walletClientType,
          };
        });

      setConnectedWallets(externalWallets);
    }
  }, [privyUser, ready, solanaWallets]);

  // Store external wallet info in database when connected
  useEffect(() => {
    const syncWalletsToDatabase = async () => {
      if (!user?.id || connectedWallets.length === 0) return;

      try {
        // Store each connected wallet in the database
        for (const wallet of connectedWallets) {
          const { error } = await supabase
            .from('user_wallets')
            .upsert({
              user_id: user.id,
              wallet_address: wallet.address,
              chain: wallet.type === 'solana' ? 'solana' : 'base',
              is_embedded: false,
              is_visible_to_user: true,
              wallet_type: wallet.walletClientType || 'unknown',
            }, {
              onConflict: 'user_id,wallet_address,chain',
            });

          if (error) {
            console.error('Error storing wallet:', error);
          }
        }
      } catch (error) {
        console.error('Error syncing wallets to database:', error);
      }
    };

    syncWalletsToDatabase();
  }, [connectedWallets, user?.id]);

  // Handle connecting external wallet via Privy
  const handleConnectWallet = async () => {
    if (!user?.id) {
      showErrorToast('Please sign in to connect a wallet.');
      return;
    }

    if (!ready) {
      showErrorToast('Wallet connection not ready. Please try again.');
      return;
    }

    try {
      setConnecting(true);

      // Open Privy's wallet connection modal
      connectWallet();

      // Show success message after modal is opened
      // The actual connection will update the UI via useEffect
    } catch (error: any) {
      console.error('Error connecting wallet:', error);

      // Handle user cancellation gracefully
      if (error.message?.includes('user closed') || error.message?.includes('User rejected')) {
        console.log('User cancelled wallet connection');
      } else {
        showErrorToast('Failed to connect wallet. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Handle disconnecting a wallet
  const handleDisconnectWallet = async (address: string) => {
    try {
      await unlinkWallet(address);
      showSuccessToast('Wallet disconnected successfully!');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      showErrorToast('Failed to disconnect wallet. Please try again.');
    }
  };

  return (
    <motion.div
      className="bg-card rounded-xl border border-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Connect External Wallet</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Connect your existing wallet (MetaMask, Phantom, etc.) to use with TarotForge.
          Your auto-created wallets will remain available.
        </p>

        <div className="space-y-4">
          {/* Connected Wallets List */}
          {connectedWallets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Connected External Wallets</p>
              {connectedWallets.map((wallet) => (
                <div
                  key={wallet.address}
                  className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {wallet.walletClientType || wallet.type}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectWallet(wallet.address)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Wallet Connection Button */}
          <button
            onClick={handleConnectWallet}
            disabled={connecting || !ready}
            className="w-full btn btn-primary flex items-center justify-center gap-2 py-3"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                {connectedWallets.length > 0 ? 'Connect Another Wallet' : 'Connect Wallet'}
              </>
            )}
          </button>

          {/* Info box */}
          <div className="p-4 bg-muted/10 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Supported Wallets</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Solana: Phantom, Solflare, Backpack</li>
                  <li>• Ethereum/Base: MetaMask, Coinbase Wallet, WalletConnect</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  External wallets are great for users who already have crypto.
                  If you're new, your auto-created wallets work just fine!
                </p>
              </div>
            </div>
          </div>

          {/* Benefits section */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Why connect an external wallet?</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Use your existing crypto holdings</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Full control of your private keys</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Compatible with other Web3 apps</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConnectExternalWallet;
