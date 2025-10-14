import { Wallet } from 'lucide-react';
import { useHybridAuth } from '../../hooks/useHybridAuth';
import { motion } from 'framer-motion';

interface WalletBadgeProps {
  onClick?: () => void;
  className?: string;
}

const WalletBadge = ({ onClick, className = '' }: WalletBadgeProps) => {
  const { isWalletConnected, walletAddress, connectWallet } = useHybridAuth();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (!isWalletConnected) {
      connectWallet();
    }
  };

  // Shorten wallet address for display (0x1234...5678)
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isWalletConnected) {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all ${className}`}
        title="Connect Wallet"
      >
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground hidden md:inline">
          Connect
        </span>
      </button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/50 bg-gradient-to-r from-primary/10 to-pink-500/10 hover:from-primary/20 hover:to-pink-500/20 transition-all ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      title={`Connected: ${walletAddress}`}
    >
      <div className="relative">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <span className="text-sm font-medium bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent hidden md:inline">
        {walletAddress && shortenAddress(walletAddress)}
      </span>
    </motion.button>
  );
};

export default WalletBadge;
