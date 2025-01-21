export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'customer' | 'partner' | 'admin';
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  partner_id?: string;
  pickup_address: string;
  delivery_address: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'delivered' | 'cancelled';
  vehicle_type: 'bike' | 'car' | 'truck';
  special_instructions?: string;
  amount: number;
  created_at: string;
  estimated_delivery_time?: string;
}