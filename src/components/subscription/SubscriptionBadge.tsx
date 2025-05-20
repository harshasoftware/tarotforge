import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Loader } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';

interface SubscriptionBadgeProps {
  className?: string;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ className = '' }) => {
  const { isSubscribed, loading } = useSubscription();

  if (loading) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${className}`}>
        <Loader className="h-3 w-3 animate-spin mr-1" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!isSubscribed) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-2 py-1 bg-primary/20 text-primary rounded-full text-xs ${className}`}
    >
      <Crown className="h-3 w-3 mr-1" />
      <span>Premium</span>
    </motion.div>
  );
};

export default SubscriptionBadge;