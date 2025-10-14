import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Copy,
  Check,
  Download,
  Link as LinkIcon,
  Unlink,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAuthStore } from '../../stores/authStorePrivy';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * WalletSection Component
 *
 * Displays and manages user's Privy wallets on the Profile page:
 * - Embedded Ethereum/Base wallet (auto-created by Privy)
 * - Embedded Solana wallet (auto-created by Privy)
 * - External wallets (MetaMask, Phantom, etc.)
 * - Export wallet functionality
 * - Link/unlink external wallets
 */
const WalletSection: React.FC = () => {
  const { user: privyUser, linkWallet, unlinkWallet, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const { user: tarotUser } = useAuthStore();

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingWallet, setExportingWallet] = useState<'ethereum' | 'solana' | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>('');

  // Get embedded wallets from Privy wallets array
  const embeddedEthWallet = wallets.find(
    (w) => w.walletClientType === 'privy' && w.chainType === 'ethereum'
  );

  const embeddedSolWallet = wallets.find(
    (w) => w.walletClientType === 'privy' && w.chainType === 'solana'
  );

  // Get external wallets (non-Privy)
  const externalWallets = wallets.filter(
    (w) => w.walletClientType !== 'privy'
  );

  /**
   * Copy wallet address to clipboard
   */
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      showSuccessToast('Address copied to clipboard!');

      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      showErrorToast('Failed to copy address');
    }
  };

  /**
   * Export wallet private key
   */
  const handleExportWallet = async (chainType: 'ethereum' | 'solana') => {
    setExportingWallet(chainType);
    setShowExportModal(true);
  };

  /**
   * Confirm export and get private key
   */
  const confirmExport = async () => {
    if (!exportingWallet) return;

    try {
      const wallet = exportingWallet === 'ethereum' ? embeddedEthWallet : embeddedSolWallet;

      if (!wallet) {
        showErrorToast('Wallet not found');
        return;
      }

      // Use Privy's exportWallet method
      await exportWallet();

      showSuccessToast('Export initiated! Follow the prompts to download your wallet.');
      setShowExportModal(false);
      setExportingWallet(null);
    } catch (error: any) {
      console.error('Export error:', error);
      showErrorToast(error.message || 'Failed to export wallet');
    }
  };

  /**
   * Link external wallet
   */
  const handleLinkWallet = async () => {
    try {
      await linkWallet();
      showSuccessToast('Wallet linking initiated! Please follow the prompts.');
    } catch (error: any) {
      console.error('Link wallet error:', error);
      showErrorToast(error.message || 'Failed to link wallet');
    }
  };

  /**
   * Unlink external wallet
   */
  const handleUnlinkWallet = async (walletAddress: string) => {
    if (!confirm(`Are you sure you want to unlink wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}?`)) {
      return;
    }

    try {
      await unlinkWallet(walletAddress);
      showSuccessToast('Wallet unlinked successfully!');
    } catch (error: any) {
      console.error('Unlink wallet error:', error);
      showErrorToast(error.message || 'Failed to unlink wallet');
    }
  };

  /**
   * Truncate wallet address for display
   */
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.div
      className="bg-card rounded-xl border border-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Wallet className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium text-lg">Web3 Wallets</h3>
        </div>

        <div className="space-y-4">
          {/* Info Banner */}
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              Embedded wallets are created automatically when you sign up.
              They're available for future NFT features.
            </p>
          </div>

          {/* Embedded Ethereum Wallet */}
          {embeddedEthWallet && (
            <div className="p-4 bg-muted/10 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Ethereum / Base Wallet</p>
                    <p className="text-xs text-muted-foreground">Embedded wallet</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 p-3 bg-background rounded-md">
                <code className="text-sm font-mono">
                  {truncateAddress(embeddedEthWallet.address)}
                </code>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyAddress(embeddedEthWallet.address)}
                    className="p-2 hover:bg-muted/50 rounded-md transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress === embeddedEthWallet.address ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleExportWallet('ethereum')}
                    className="p-2 hover:bg-muted/50 rounded-md transition-colors"
                    title="Export wallet"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Embedded Solana Wallet */}
          {embeddedSolWallet && (
            <div className="p-4 bg-muted/10 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">Solana Wallet</p>
                    <p className="text-xs text-muted-foreground">Embedded wallet</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 p-3 bg-background rounded-md">
                <code className="text-sm font-mono">
                  {truncateAddress(embeddedSolWallet.address)}
                </code>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyAddress(embeddedSolWallet.address)}
                    className="p-2 hover:bg-muted/50 rounded-md transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress === embeddedSolWallet.address ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleExportWallet('solana')}
                    className="p-2 hover:bg-muted/50 rounded-md transition-colors"
                    title="Export wallet"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* External Wallets */}
          {externalWallets.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-sm mb-3">Connected Wallets</h4>
              <div className="space-y-3">
                {externalWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className="p-4 bg-muted/10 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {wallet.walletClientType || 'External Wallet'}
                          </p>
                          <code className="text-xs font-mono text-muted-foreground">
                            {truncateAddress(wallet.address)}
                          </code>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlinkWallet(wallet.address)}
                        className="p-2 hover:bg-destructive/10 rounded-md transition-colors text-destructive"
                        title="Unlink wallet"
                      >
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link External Wallet Button */}
          <button
            onClick={handleLinkWallet}
            className="w-full btn btn-outline border-input hover:bg-secondary/50 py-3 flex items-center justify-center"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Link External Wallet
          </button>
        </div>
      </div>

      {/* Export Wallet Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              className="bg-card rounded-xl border border-border p-6 max-w-md w-full"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
                <h3 className="text-lg font-semibold">Export Wallet</h3>
              </div>

              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-4">
                  You're about to export your <strong>{exportingWallet}</strong> wallet.
                  This will reveal your private key.
                </p>

                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive font-medium mb-2">
                    ⚠️ Security Warning
                  </p>
                  <ul className="text-xs text-destructive space-y-1">
                    <li>• Never share your private key with anyone</li>
                    <li>• Store it securely offline</li>
                    <li>• Anyone with your private key can access your funds</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 btn btn-ghost border border-input py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmExport}
                  className="flex-1 btn btn-primary py-2"
                >
                  I Understand, Export
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WalletSection;
