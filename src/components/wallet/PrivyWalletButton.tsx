import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Wallet, LogOut, Link as LinkIcon } from 'lucide-react';

interface PrivyWalletButtonProps {
  className?: string;
  variant?: 'connect' | 'link' | 'manage';
}

/**
 * Universal wallet button that adapts based on authentication state
 *
 * Variants:
 * - connect: Shows "Connect Wallet" for login
 * - link: Shows "Link Wallet" to add wallet to existing account
 * - manage: Shows wallet address with dropdown menu
 */
export const PrivyWalletButton: React.FC<PrivyWalletButtonProps> = ({
  className = '',
  variant = 'connect',
}) => {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();

  if (!ready) {
    return (
      <button disabled className={`btn btn-outline ${className}`}>
        <Wallet className="w-4 h-4 mr-2" />
        Loading...
      </button>
    );
  }

  // Connect variant - for login page
  if (variant === 'connect' && !authenticated) {
    return (
      <button
        onClick={login}
        className={`btn btn-outline hover:bg-purple-600 hover:text-white transition-colors ${className}`}
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </button>
    );
  }

  // Link variant - to add wallet to existing account
  if (variant === 'link' && authenticated) {
    return (
      <button
        onClick={linkWallet}
        className={`btn btn-primary ${className}`}
      >
        <LinkIcon className="w-4 h-4 mr-2" />
        Link Wallet
      </button>
    );
  }

  // Manage variant - shows connected wallet
  if (variant === 'manage' && authenticated && user) {
    const wallet = user.wallet;

    if (!wallet) {
      return (
        <button
          onClick={linkWallet}
          className={`btn btn-outline ${className}`}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Link Wallet
        </button>
      );
    }

    return (
      <div className="relative group">
        <button
          className={`btn btn-outline flex items-center gap-2 ${className}`}
        >
          <Wallet className="w-4 h-4" />
          <span className="font-mono text-sm">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </span>
        </button>

        {/* Dropdown menu */}
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(wallet.address);
                // Show toast
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded transition-colors"
            >
              📋 Copy Address
            </button>

            <button
              onClick={linkWallet}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded transition-colors"
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Link Another Wallet
            </button>

            <div className="border-t border-border my-1"></div>

            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded transition-colors"
            >
              <LogOut className="w-4 h-4 inline mr-2" />
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
