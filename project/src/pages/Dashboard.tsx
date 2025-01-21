import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock, Truck, DollarSign, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Order } from '../types';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalEarnings: 0,
    completionRate: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        // Filter orders based on user role
        if (user.role === 'customer') {
          query = query.eq('customer_id', user.id);
        } else if (user.role === 'partner') {
          query = query.eq('partner_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        setOrders(data || []);
        
        // Calculate stats
        const totalOrders = data?.length || 0;
        const activeOrders = data?.filter(
          order => order.status !== 'delivered' && order.status !== 'cancelled'
        ).length || 0;
        const totalEarnings = data?.reduce((sum, order) => sum + order.amount, 0) || 0;
        const completedOrders = data?.filter(order => order.status === 'delivered').length || 0;
        const completionRate = totalOrders ? (completedOrders / totalOrders) * 100 : 0;

        setStats({
          totalOrders,
          activeOrders,
          totalEarnings,
          completionRate,
        });
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user.full_name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {user.role === 'customer'
            ? 'Manage your deliveries and track your orders'
            : 'Manage your delivery tasks and track your earnings'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {user.role === 'customer' ? 'Total Spent' : 'Total Earnings'}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">₹{stats.totalEarnings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completionRate.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.role === 'customer' && (
        <div className="mb-8">
          <button
            onClick={() => navigate('/create-order')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Truck className="h-4 w-4 mr-2" />
            Create New Order
          </button>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {user.role === 'customer' ? 'Your Orders' : 'Assigned Orders'}
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-4 py-4 sm:px-6">Loading orders...</li>
          ) : orders.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">No orders found</li>
          ) : (
            orders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p className="truncate">From: {order.pickup_address}</p>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p className="truncate">To: {order.delivery_address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 flex items-center">
                    <p className="text-sm font-medium text-gray-900">₹{order.amount}</p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}