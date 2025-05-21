import React, { useState, useEffect } from 'react';
import { Clock, ArrowDownRight, ArrowUpRight, RotateCcw, XCircle } from 'lucide-react';
import { useCredits } from '../../context/CreditContext';

interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: 'allocation' | 'consumption' | 'expiration' | 'rollover';
  basic_credits_change: number;
  premium_credits_change: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

const CreditTransactionHistory: React.FC = () => {
  const { getCreditTransactions, refreshCredits } = useCredits();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        // Ensure credits are refreshed first
        await refreshCredits();
        // Then fetch transactions
        const result = await getCreditTransactions(10);
        setTransactions(result);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [getCreditTransactions, refreshCredits]);

  // Format transaction date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get icon and color based on transaction type
  const getTransactionIcon = (transaction: CreditTransaction) => {
    const change = transaction.basic_credits_change + transaction.premium_credits_change;
    
    if (transaction.transaction_type === 'allocation') {
      return <ArrowUpRight className="h-4 w-4 text-success" />;
    } else if (transaction.transaction_type === 'consumption') {
      return <ArrowDownRight className="h-4 w-4 text-warning" />;
    } else if (transaction.transaction_type === 'expiration') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    } else {
      return <RotateCcw className="h-4 w-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading transaction history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="flex items-center font-medium">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          Recent Credit Transactions
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        {transactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Description</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Basic</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Premium</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="mr-2">
                        {getTransactionIcon(transaction)}
                      </div>
                      <span className="text-sm capitalize">{transaction.transaction_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{transaction.description}</td>
                  <td className={`px-4 py-3 text-sm text-right ${transaction.basic_credits_change > 0 ? 'text-success' : transaction.basic_credits_change < 0 ? 'text-warning' : ''}`}>
                    {transaction.basic_credits_change > 0 ? `+${transaction.basic_credits_change}` : transaction.basic_credits_change}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${transaction.premium_credits_change > 0 ? 'text-success' : transaction.premium_credits_change < 0 ? 'text-warning' : ''}`}>
                    {transaction.premium_credits_change > 0 ? `+${transaction.premium_credits_change}` : transaction.premium_credits_change}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{formatDate(transaction.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CreditTransactionHistory;