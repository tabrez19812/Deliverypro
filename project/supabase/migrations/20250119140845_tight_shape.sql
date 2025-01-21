/*
  # Initial Schema Setup for Delivery Service

  1. New Tables
    - users (extends auth.users)
      - id (uuid, primary key)
      - full_name (text)
      - avatar_url (text, optional)
      - role (text)
      - created_at (timestamp)
    
    - orders
      - id (uuid, primary key)
      - customer_id (uuid, references users)
      - partner_id (uuid, references users, optional)
      - pickup_address (text)
      - delivery_address (text)
      - status (text)
      - vehicle_type (text)
      - special_instructions (text, optional)
      - amount (numeric)
      - created_at (timestamp)
      - estimated_delivery_time (timestamp, optional)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access
    - Add policies for order access
*/

-- Create users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL CHECK (role IN ('customer', 'partner', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.users NOT NULL,
  partner_id uuid REFERENCES public.users,
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'delivered', 'cancelled')),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('bike', 'car', 'truck')),
  special_instructions text,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz DEFAULT now(),
  estimated_delivery_time timestamptz
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Orders policies
CREATE POLICY "Customers can view their own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Partners can view assigned orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = partner_id);

CREATE POLICY "Customers can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Partners can update assigned orders"
  ON public.orders
  FOR UPDATE
  USING (auth.uid() = partner_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();