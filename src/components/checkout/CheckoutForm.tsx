import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CreditCard } from 'lucide-react';

interface CheckoutFormProps {
  amount: number;
  onSuccess: () => void;
}

const CheckoutForm = ({ amount, onSuccess }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // For demo purposes, simulate success
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1500);
    
    // In a real app, this would process the payment through Stripe
    // const cardElement = elements.getElement(CardElement);
    
    // if (cardElement) {
    //   const { error, paymentMethod } = await stripe.createPaymentMethod({
    //     type: 'card',
    //     card: cardElement,
    //   });
    
    //   if (error) {
    //     setError(error.message || 'An error occurred with your payment');
    //     setLoading(false);
    //   } else {
    //     // Process payment with backend
    //     // onSuccess();
    //   }
    // }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium">Card Information</label>
        <div className="p-3 border border-input rounded-md bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full btn btn-primary py-3 font-medium text-base disabled:opacity-70"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Pay ${amount.toFixed(2)}
          </span>
        )}
      </button>
      
      <p className="text-xs text-center text-muted-foreground">
        Your payment is secure and encrypted. By completing this purchase, you agree to our Terms of Service.
      </p>
    </form>
  );
};

export default CheckoutForm;