-- Create table to store QuickBooks OAuth connection info
CREATE TABLE public.qbo_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table to store synced customers from QuickBooks
CREATE TABLE public.qbo_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qbo_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  company_name TEXT,
  given_name TEXT,
  family_name TEXT,
  email TEXT,
  phone TEXT,
  billing_address_line1 TEXT,
  billing_address_city TEXT,
  billing_address_state TEXT,
  billing_address_postal_code TEXT,
  billing_address_country TEXT,
  active BOOLEAN DEFAULT true,
  balance NUMERIC(10, 2) DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, qbo_id)
);

-- Enable Row Level Security
ALTER TABLE public.qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qbo_connections
CREATE POLICY "Users can view their own QBO connection"
ON public.qbo_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own QBO connection"
ON public.qbo_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QBO connection"
ON public.qbo_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QBO connection"
ON public.qbo_connections
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for qbo_customers
CREATE POLICY "Users can view their own QBO customers"
ON public.qbo_customers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own QBO customers"
ON public.qbo_customers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QBO customers"
ON public.qbo_customers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QBO customers"
ON public.qbo_customers
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_qbo_connections_updated_at
BEFORE UPDATE ON public.qbo_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qbo_customers_updated_at
BEFORE UPDATE ON public.qbo_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();