/**
 * Example: How to integrate Base Wallet linking into your TarotForge app
 *
 * This file shows complete examples of how to use the Base wallet
 * integration in different scenarios.
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LinkedWallets } from '../components/wallet/LinkedWallets';
import { LinkBaseWallet } from '../components/wallet/LinkBaseWallet';
import { Wallet, Shield, Zap } from 'lucide-react';

// ============================================================================
// EXAMPLE 1: User Profile Page with Wallet Management
// ============================================================================

export function UserProfileWithWallets() {
  const user = useAuthStore((state) => state.user);
  const linkedWallets = useAuthStore((state) => state.linkedWallets);

  if (!user) {
    return <div>Please sign in to view your profile</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* User Info Section */}
      <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Profile</h2>
        <div className="space-y-2">
          <p className="text-white/70">
            <span className="font-semibold">Name:</span> {user.full_name || user.username}
          </p>
          <p className="text-white/70">
            <span className="font-semibold">Email:</span> {user.email}
          </p>
          <p className="text-white/70">
            <span className="font-semibold">Linked Wallets:</span> {linkedWallets.length}
          </p>
        </div>
      </div>

      {/* Wallet Management Section */}
      <LinkedWallets />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Wallet-Gated Feature
// ============================================================================

export function WalletGatedFeature() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const fetchLinkedWallets = useAuthStore((state) => state.fetchLinkedWallets);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    fetchLinkedWallets();
  }, [fetchLinkedWallets]);

  const hasLinkedWallet = linkedWallets.length > 0;

  if (!hasLinkedWallet) {
    return (
      <div className="text-center p-8 bg-purple-900/20 rounded-lg border border-purple-500/20">
        <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">
          Link Your Wallet to Access This Feature
        </h3>
        <p className="text-white/70 mb-6">
          This premium feature requires a linked Base wallet for enhanced security
          and Web3 functionality.
        </p>
        <button
          onClick={() => setShowLinkModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Link Wallet Now
        </button>

        {showLinkModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
              <LinkBaseWallet
                onSuccess={() => {
                  setShowLinkModal(false);
                  fetchLinkedWallets();
                }}
                onCancel={() => setShowLinkModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
        <Shield className="w-6 h-6 text-green-500" />
        <div>
          <p className="text-green-200 font-semibold">Wallet Verified</p>
          <p className="text-white/50 text-sm">
            {linkedWallets[0].wallet_address.slice(0, 6)}...
            {linkedWallets[0].wallet_address.slice(-4)}
          </p>
        </div>
      </div>

      <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          Premium Web3 Feature
        </h3>
        <p className="text-white/70">
          You now have access to this exclusive feature! Your wallet has been verified.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Wallet Connection Status Badge
// ============================================================================

export function WalletStatusBadge() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const user = useAuthStore((state) => state.user);
  const fetchLinkedWallets = useAuthStore((state) => state.fetchLinkedWallets);

  useEffect(() => {
    if (user) {
      fetchLinkedWallets();
    }
  }, [user, fetchLinkedWallets]);

  if (!user) return null;

  const hasWallet = linkedWallets.length > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-500/20">
      <Wallet className={`w-4 h-4 ${hasWallet ? 'text-green-400' : 'text-white/50'}`} />
      <span className="text-sm text-white/70">
        {hasWallet ? 'Wallet Linked' : 'No Wallet'}
      </span>
      {hasWallet && (
        <span className="text-xs text-white/50 font-mono">
          {linkedWallets[0].wallet_address.slice(0, 4)}...
          {linkedWallets[0].wallet_address.slice(-4)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Wallet Benefits Banner
// ============================================================================

export function WalletBenefitsBanner() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const user = useAuthStore((state) => state.user);
  const [showLinkModal, setShowLinkModal] = useState(false);

  if (!user || linkedWallets.length > 0) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-purple-500/20 p-3 rounded-lg">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">
              Unlock Web3 Features with Base Wallet
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Link your Base wallet to access exclusive features, enhanced security,
              and future token-gated content.
            </p>
            <ul className="space-y-2 mb-4">
              <li className="text-white/60 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Enhanced account security
              </li>
              <li className="text-white/60 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Access to Web3 features
              </li>
              <li className="text-white/60 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Future NFT and token integration
              </li>
            </ul>
            <button
              onClick={() => setShowLinkModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Link Wallet Now
            </button>
          </div>
        </div>
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
            <LinkBaseWallet
              onSuccess={() => setShowLinkModal(false)}
              onCancel={() => setShowLinkModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// EXAMPLE 5: Settings Page with Full Account Management
// ============================================================================

export function AccountSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-white">Account Settings</h1>

      {/* Authentication Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Authentication</h2>
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Google Account</p>
              <p className="text-white/50 text-sm">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="text-red-400 hover:text-red-300 transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Web3 Wallets</h2>
        <LinkedWallets />
      </div>

      {/* Wallet Benefits */}
      <WalletBenefitsBanner />
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Using Wallet Data in Custom Logic
// ============================================================================

export function useWalletVerification() {
  const linkedWallets = useAuthStore((state) => state.linkedWallets);
  const fetchLinkedWallets = useAuthStore((state) => state.fetchLinkedWallets);

  useEffect(() => {
    fetchLinkedWallets();
  }, [fetchLinkedWallets]);

  return {
    hasWallet: linkedWallets.length > 0,
    wallets: linkedWallets,
    primaryWallet: linkedWallets.find((w) => w.is_primary) || linkedWallets[0],
  };
}

// Usage in a component:
export function CustomFeature() {
  const { hasWallet, primaryWallet } = useWalletVerification();

  if (!hasWallet) {
    return <div>Please link a wallet to continue</div>;
  }

  return (
    <div>
      <p>Connected wallet: {primaryWallet?.wallet_address}</p>
      {/* Your feature content */}
    </div>
  );
}
