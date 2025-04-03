-- backend/db/investment_tracking.sql

-- Create investment_portfolios table
CREATE TABLE IF NOT EXISTS public.investment_portfolios (
                                                            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    goal_amount numeric,
    target_date date,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
    );

-- Create investments table
CREATE TABLE IF NOT EXISTS public.investments (
                                                  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id uuid REFERENCES public.investment_portfolios(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    symbol text,
    type text NOT NULL,
    purchase_date date NOT NULL,
    amount numeric NOT NULL,
    purchase_price numeric NOT NULL,
    current_price numeric,
    last_updated timestamptz DEFAULT NOW(),
    notes text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
    );

-- Create investment_transactions table to track buys, sells, dividends, etc.
CREATE TABLE IF NOT EXISTS public.investment_transactions (
                                                              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id uuid REFERENCES public.investments(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_date date NOT NULL,
    transaction_type text NOT NULL, -- BUY, SELL, DIVIDEND, SPLIT, etc.
    amount numeric NOT NULL,
    price numeric NOT NULL,
    fees numeric DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT NOW()
    );

-- Set up Row Level Security
ALTER TABLE public.investment_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for investment_portfolios
CREATE POLICY "Users can view own portfolios" ON public.investment_portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON public.investment_portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON public.investment_portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON public.investment_portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for investments
CREATE POLICY "Users can view own investments" ON public.investments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" ON public.investments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" ON public.investments
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for investment_transactions
CREATE POLICY "Users can view own transactions" ON public.investment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.investment_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.investment_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.investment_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to update investment current prices
CREATE OR REPLACE FUNCTION public.update_investment_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_price and last_updated
    NEW.current_price := NEW.purchase_price;
    NEW.last_updated := NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set initial current price when creating an investment
CREATE TRIGGER set_investment_current_price
    BEFORE INSERT ON public.investments
    FOR EACH ROW EXECUTE FUNCTION public.update_investment_prices();

-- Create a function to create a default portfolio for new users
CREATE OR REPLACE FUNCTION public.create_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.investment_portfolios (user_id, name, description)
VALUES (new.id, 'My Default Portfolio', 'Default investment portfolio');
RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log error and continue without failing
        RAISE LOG 'Error creating default portfolio: %', SQLERRM;
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create a default portfolio for new users
DROP TRIGGER IF EXISTS create_default_portfolio_trigger ON auth.users;
CREATE TRIGGER create_default_portfolio_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_default_portfolio();