import React, { useState } from 'react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { Wallet, Link, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { generateSiweMessage, generateNonce } from '../../lib/baseWalletAuth';
import toast from 'react-hot-toast';

interface LinkBaseWalletProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LinkBaseWallet: React.FC<LinkBaseWalletProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string>('');

  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const linkBaseWallet = useAuthStore((state) => state.linkBaseWallet);
  const user = useAuthStore((state) => state.user);

  const handleConnectWallet = async (connectorId: string) => {
    try {
      setError(null);
      const connector = connectors.find((c) => c.id === connectorId);
      if (!connector) {
        throw new Error('Connector not found');
      }
      await connect({ connector });
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleLinkWallet = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!user) {
      setError('You must be logged in to link a wallet');
      return;
    }

    setIsLinking(true);
    setError(null);

    try {
      // Generate nonce
      const newNonce = generateNonce();
      setNonce(newNonce);

      // Generate SIWE message
      const message = await generateSiweMessage(address, newNonce, chainId);

      // Request signature from user
      const signature = await signMessageAsync({ message });

      // Link wallet to account
      const result = await linkBaseWallet(address, signature, message, newNonce);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Base wallet linked successfully!');

      // Disconnect wallet after linking
      disconnect();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error linking wallet:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to link wallet';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLinking(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center p-6 bg-purple-900/20 rounded-lg border border-purple-500/20">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-white/70">
          Please sign in with Google first to link a Base wallet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">
          Link Your Base Wallet
        </h3>
        <p className="text-white/70">
          Connect your Base wallet to access Web3 features and enhance your
          account security
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {!isConnected ? (
        <div className="space-y-3">
          <p className="text-white/70 text-center mb-4">
            Choose a wallet to connect:
          </p>

          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnectWallet(connector.id)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              <Wallet className="w-5 h-5" />
              Connect with {connector.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-200 font-semibold">Wallet Connected</p>
              <p className="text-white/50 text-sm font-mono mt-1">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
            <p className="text-white/70 text-sm mb-3">
              You'll be asked to sign a message to verify wallet ownership. This
              is free and doesn't require any gas fees.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLinkWallet}
              disabled={isLinking}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link className="w-5 h-5" />
                  Link Wallet
                </>
              )}
            </button>

            <button
              onClick={() => disconnect()}
              disabled={isLinking}
              className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLinking}
              className="w-full text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
