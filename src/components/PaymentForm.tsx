import { useState } from 'react';
import { stripePromise } from '../lib/stripe';

interface PaymentFormProps {
  amount: number;
  onSuccess: () => void;
}

export function PaymentForm({ amount, onSuccess }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Here we would typically create a payment intent on the server
      // For now, we'll just simulate a successful payment
      setTimeout(() => {
        setLoading(false);
        onSuccess();
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full py-2 px-4 rounded ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white font-semibold`}
      >
        {loading ? 'Processing...' : `Pay $${amount}`}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}