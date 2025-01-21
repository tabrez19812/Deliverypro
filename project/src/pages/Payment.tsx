import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, Truck, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { amount, orderId } = location.state || {};

  useEffect(() => {
    if (!amount || !orderId) {
      navigate('/dashboard');
    }
  }, [amount, orderId, navigate]);

  const handleCODPayment = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_method: 'cod',
          payment_status: 'pending'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;
      
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose your payment method
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-gray-500">Order Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{amount}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCODPayment}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 border-2 border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="h-5 w-5 mr-2" />
              Pay with Cash on Delivery
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Coming Soon</span>
              </div>
            </div>

            <button
              disabled
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Pay Online (Coming Soon)
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Your order will be confirmed once you select a payment method
          </p>
        </div>
      </div>
    </div>
  );
}