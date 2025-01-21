import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Truck, Package, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

const VEHICLE_TYPES = [
  { id: 'bike', name: 'Bike', basePrice: 50, pricePerKm: 10 },
  { id: 'car', name: 'Car', basePrice: 100, pricePerKm: 15 },
  { id: 'truck', name: 'Truck', basePrice: 200, pricePerKm: 25 },
] as const;

declare global {
  interface Window {
    google: any;
  }
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [orderData, setOrderData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    vehicleType: 'bike' as typeof VEHICLE_TYPES[number]['id'],
    specialInstructions: '',
  });

  // Initialize Google Maps services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      initAutocomplete();
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initAutocomplete = () => {
    const pickupInput = document.getElementById('pickupAddress') as HTMLInputElement;
    const deliveryInput = document.getElementById('deliveryAddress') as HTMLInputElement;

    new window.google.maps.places.Autocomplete(pickupInput);
    new window.google.maps.places.Autocomplete(deliveryInput);
  };

  // Calculate distance between pickup and delivery
  const calculateDistance = async () => {
    const { pickupAddress, deliveryAddress } = orderData;
    if (!pickupAddress || !deliveryAddress || !window.google) return;

    const service = new window.google.maps.DistanceMatrixService();
    
    try {
      const response = await service.getDistanceMatrix({
        origins: [pickupAddress],
        destinations: [deliveryAddress],
        travelMode: 'DRIVING',
        unitSystem: window.google.maps.UnitSystem.METRIC,
      });

      if (response.rows[0].elements[0].status === 'OK') {
        const distanceInKm = response.rows[0].elements[0].distance.value / 1000;
        setDistance(distanceInKm);
      }
    } catch (err) {
      console.error('Error calculating distance:', err);
    }
  };

  // Calculate price based on vehicle type and distance
  const calculatePrice = () => {
    if (!distance) return null;
    
    const selectedVehicle = VEHICLE_TYPES.find(v => v.id === orderData.vehicleType)!;
    const distancePrice = Math.ceil(distance * selectedVehicle.pricePerKm);
    return selectedVehicle.basePrice + distancePrice;
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      const amount = calculatePrice();
      if (!amount) throw new Error('Unable to calculate price');
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: user.id,
            pickup_address: orderData.pickupAddress,
            delivery_address: orderData.deliveryAddress,
            vehicle_type: orderData.vehicleType,
            special_instructions: orderData.specialInstructions,
            amount,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      navigate('/payment', { 
        state: { 
          orderId: order.id,
          amount: order.amount
        }
      });
    } catch (err) {
      setError('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateDistance();
  }, [orderData.pickupAddress, orderData.deliveryAddress]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the delivery details below
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

      <form onSubmit={handleCreateOrder} className="bg-white shadow rounded-lg">
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700">
                Pickup Address
              </label>
              <div className="mt-1 relative">
                <MapPin className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="pickupAddress"
                  required
                  value={orderData.pickupAddress}
                  onChange={(e) => setOrderData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter pickup address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700">
                Delivery Address
              </label>
              <div className="mt-1 relative">
                <MapPin className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="deliveryAddress"
                  required
                  value={orderData.deliveryAddress}
                  onChange={(e) => setOrderData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter delivery address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <div className="grid grid-cols-3 gap-4">
                {VEHICLE_TYPES.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setOrderData(prev => ({ ...prev, vehicleType: vehicle.id }))}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                      orderData.vehicleType === vehicle.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Truck className={`h-6 w-6 mb-2 ${
                      orderData.vehicleType === vehicle.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <span className="text-sm font-medium">{vehicle.name}</span>
                    <span className="text-xs text-gray-500 mt-1">
                      ₹{vehicle.basePrice} + ₹{vehicle.pricePerKm}/km
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700">
                Special Instructions
              </label>
              <div className="mt-1">
                <textarea
                  id="specialInstructions"
                  rows={3}
                  value={orderData.specialInstructions}
                  onChange={(e) => setOrderData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Add any special instructions for the delivery partner"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div>
              {distance && (
                <p className="text-sm text-gray-500">
                  Distance: {distance.toFixed(1)} km
                </p>
              )}
              <p className="text-lg font-medium text-gray-900">
                {calculatePrice() ? `₹${calculatePrice()}` : 'Calculating price...'}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !distance}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Creating Order...'
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}