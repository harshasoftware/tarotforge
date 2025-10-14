import React, { useState } from 'react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogIn, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { generateWalletAuthMessage, generateNonce } from '../../lib/baseWalletAuth';
import toast from 'react-hot-toast';

interface SignInWithWalletProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SignInWithWallet: React.FC<SignInWithWalletProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const signInWithWallet = useAuthStore((state) => state.signInWithWallet);

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

  const handleSignIn = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      // Generate nonce
      const nonce = generateNonce();

      // Generate SIWE message for authentication
      const message = await generateWalletAuthMessage(address, nonce, chainId);

      // Request signature from user
      const signature = await signMessageAsync({ message });

      // Sign in with wallet
      const result = await signInWithWallet(address, signature, message, nonce);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Signed in successfully!');

      // Disconnect wallet after sign-in (optional)
      disconnect();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error signing in with wallet:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">
          Sign In with Your Wallet
        </h3>
        <p className="text-white/70">
          Connect your Base wallet to sign in without an email address
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
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>

            <button
              onClick={() => disconnect()}
              disabled={isSigningIn}
              className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSigningIn}
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
