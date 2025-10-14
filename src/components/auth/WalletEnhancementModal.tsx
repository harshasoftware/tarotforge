import { motion } from 'framer-motion';
import { X, Wallet, Sparkles, Lock, Star } from 'lucide-react';
import { useHybridAuth } from '../../hooks/useHybridAuth';

interface WalletEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletEnhancementModal = ({ isOpen, onClose }: WalletEnhancementModalProps) => {
  const {
    connectWallet,
    linkWalletToAccount,
    isWalletConnected,
    isLinkingWallet,
    supabaseUser
  } = useHybridAuth();

  const handleConnectAndLink = async () => {
    if (!isWalletConnected) {
      // First connect the wallet
      await connectWallet();
    }

    // Then link it to the Supabase account
    if (supabaseUser) {
      await linkWalletToAccount();
    }

    // Close modal after successful linking
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        className="bg-card rounded-xl overflow-hidden max-w-lg w-full border border-primary/20"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div
          className="relative p-6 border-b border-border"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-serif font-bold text-center mb-2">
            Unlock NFT Mystical Powers
          </h2>
          <p className="text-center text-muted-foreground text-sm">
            Connect your wallet to access exclusive Web3 features
          </p>
        </div>

        {/* Benefits List */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <BenefitItem
              icon={<Star className="h-5 w-5 text-primary" />}
              title="Rent Rare NFT Tarot Decks"
              description="Access exclusive decks owned by the community"
            />
            <BenefitItem
              icon={<Lock className="h-5 w-5 text-primary" />}
              title="List Your NFT Collections"
              description="Monetize your digital tarot deck collection"
            />
            <BenefitItem
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              title="Token-Gated Premium Readings"
              description="Unlock special readings for NFT holders"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 btn btn-secondary py-3 text-sm"
            >
              Skip for Now
            </button>
            <button
              onClick={handleConnectAndLink}
              disabled={isLinkingWallet}
              className="flex-1 btn btn-primary py-3 text-sm relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
              }}
            >
              {isLinkingWallet ? (
                <span className="flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                  Connecting...
                </span>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2 inline" />
                  Connect Wallet
                </>
              )}
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            You can always connect your wallet later from your profile settings
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Benefit Item Component
interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitItem = ({ icon, title, description }: BenefitItemProps) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <h4 className="font-medium text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default WalletEnhancementModal;
