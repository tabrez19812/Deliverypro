import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Package, Clock, Phone, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

export default function TrackOrder() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [deliveryPartner, setDeliveryPartner] = useState<any>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            partner:partner_id (
              full_name,
              phone_number
            )
          `)
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(data);
        if (data.partner) {
          setDeliveryPartner(data.partner);
        }

        // Subscribe to real-time updates
        const subscription = supabase
          .channel(`order-${orderId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `id=eq.${orderId}`,
            },
            (payload) => {
              setOrder(payload.new as Order);
              if (payload.new.current_location) {
                updateMarkerPosition(payload.new.current_location);
              }
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        setError('Failed to load order details');
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!order) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      initMap();
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [order]);

  const initMap = () => {
    if (!order || !window.google) return;

    const map = new window.google.maps.Map(document.getElementById('map')!, {
      zoom: 13,
      center: { lat: 0, lng: 0 },
    });

    mapRef.current = map;

    // Create markers for pickup and delivery locations
    const bounds = new window.google.maps.LatLngBounds();
    
    // Geocode addresses to get coordinates
    const geocoder = new window.google.maps.Geocoder();

    // Add pickup marker
    geocoder.geocode({ address: order.pickup_address }, (results: any, status: any) => {
      if (status === 'OK') {
        new window.google.maps.Marker({
          position: results[0].geometry.location,
          map,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new window.google.maps.Size(40, 40),
          },
          title: 'Pickup Location',
        });
        bounds.extend(results[0].geometry.location);
        map.fitBounds(bounds);
      }
    });

    // Add delivery marker
    geocoder.geocode({ address: order.delivery_address }, (results: any, status: any) => {
      if (status === 'OK') {
        new window.google.maps.Marker({
          position: results[0].geometry.location,
          map,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(40, 40),
          },
          title: 'Delivery Location',
        });
        bounds.extend(results[0].geometry.location);
        map.fitBounds(bounds);
      }
    });

    // Add delivery partner marker if available
    if (order.current_location) {
      const deliveryPartnerMarker = new window.google.maps.Marker({
        position: order.current_location,
        map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
        },
        title: 'Delivery Partner',
      });
      markerRef.current = deliveryPartnerMarker;
      bounds.extend(order.current_location);
    }
  };

  const updateMarkerPosition = (position: google.maps.LatLngLiteral) => {
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Order not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Track Order #{order.id.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time tracking of your delivery
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div id="map" className="h-[500px] w-full"></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Status</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </p>
                  <p className="text-xs text-gray-500">Current Status</p>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.estimated_delivery_time
                      ? new Date(order.estimated_delivery_time).toLocaleTimeString()
                      : 'Calculating...'}
                  </p>
                  <p className="text-xs text-gray-500">Estimated Delivery Time</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Details</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-sm font-medium text-gray-900">Pickup Location</p>
                </div>
                <p className="text-sm text-gray-500 ml-7">{order.pickup_address}</p>
              </div>

              <div>
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm font-medium text-gray-900">Delivery Location</p>
                </div>
                <p className="text-sm text-gray-500 ml-7">{order.delivery_address}</p>
              </div>

              {deliveryPartner && (
                <div>
                  <div className="flex items-center mb-2">
                    <Phone className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="text-sm font-medium text-gray-900">Contact Driver</p>
                  </div>
                  <div className="ml-7">
                    <p className="text-sm text-gray-900">{deliveryPartner.full_name}</p>
                    <a
                      href={`tel:${deliveryPartner.phone_number}`}
                      className="mt-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call Delivery Partner
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}