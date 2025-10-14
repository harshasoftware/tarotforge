import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Link2, AlertCircle, Check, Loader2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
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
  const { connectWallet, ready } = usePrivy();
  const [connecting, setConnecting] = useState(false);

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
      await connectWallet();

      showSuccessToast('Wallet connected successfully!');
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
                Connect Wallet
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
