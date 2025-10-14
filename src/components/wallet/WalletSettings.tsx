import React from 'react';
import { motion } from 'framer-motion';
import WalletDashboard from './WalletDashboard';
import ConnectExternalWallet from './ConnectExternalWallet';

/**
 * WalletSettings Component
 *
 * Container component that combines WalletDashboard and ConnectExternalWallet
 * into a cohesive wallet management section for the profile page.
 *
 * This component follows the progressive revelation pattern:
 * - WalletDashboard is hidden until user reveals their wallets
 * - ConnectExternalWallet is always visible for users who want it
 */
const WalletSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-serif font-bold mb-2">Wallet Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your blockchain wallets and Web3 features
        </p>
      </motion.div>

      {/* Wallet Dashboard (hidden by default, shows embedded wallets) */}
      <WalletDashboard />

      {/* Connect External Wallet */}
      <ConnectExternalWallet />
    </div>
  );
};

export default WalletSettings;
