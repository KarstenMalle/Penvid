-- backend/db/financial_overview.sql
-- Schema for the financial overview feature

-- Create financial_overview table to store user financial summary
CREATE TABLE IF NOT EXISTS public.financial_overview (
                                                         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_assets numeric DEFAULT 0,
    total_liabilities numeric DEFAULT 0,
    net_worth numeric DEFAULT 0,
    monthly_income numeric DEFAULT 0,
    monthly_expenses numeric DEFAULT 0,
    monthly_surplus numeric DEFAULT 0,
    savings_goal numeric DEFAULT 0,
    savings_goal_target_date date,
    investment_allocation jsonb,
    updated_at timestamptz DEFAULT NOW()
    );

-- Set up Row Level Security
ALTER TABLE public.financial_overview ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own financial overview" ON public.financial_overview
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own financial overview" ON public.financial_overview
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial overview" ON public.financial_overview
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a trigger to automatically create financial overview when a new user signs up
CREATE OR REPLACE FUNCTION public.create_financial_overview()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.financial_overview (user_id)
VALUES (new.id);
RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error and continue without failing
    RAISE LOG 'Error creating financial overview: %', SQLERRM;
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for handling new user signups
DROP TRIGGER IF EXISTS create_financial_overview_trigger ON auth.users;
CREATE TRIGGER create_financial_overview_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_financial_overview();

-- Create accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.accounts (
                                               id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- checking, savings, investment, credit, etc.
    balance numeric DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    UNIQUE(user_id, name)
    );

-- Set up Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create a trigger to automatically add a default account for new users
CREATE OR REPLACE FUNCTION public.create_default_account()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.accounts (user_id, name, type, balance, is_primary)
VALUES (new.id, 'Primary Checking', 'checking', 1000, true);
RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error and continue without failing
    RAISE LOG 'Error creating default account: %', SQLERRM;
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for handling new user signups
DROP TRIGGER IF EXISTS create_default_account_trigger ON auth.users;
CREATE TRIGGER create_default_account_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_default_account();

-- Function to update financial overview from account balances
CREATE OR REPLACE FUNCTION public.update_financial_overview()
RETURNS TRIGGER AS $$
DECLARE
total_assets_val numeric;
    total_liabilities_val numeric;
BEGIN
    -- Calculate total assets from accounts with positive balances
SELECT COALESCE(SUM(balance), 0) INTO total_assets_val
FROM public.accounts
WHERE user_id = NEW.user_id AND balance >= 0;

-- Calculate total liabilities from accounts with negative balances
SELECT COALESCE(SUM(ABS(balance)), 0) INTO total_liabilities_val
FROM public.accounts
WHERE user_id = NEW.user_id AND balance < 0;

-- Update financial overview
UPDATE public.financial_overview
SET
    total_assets = total_assets_val,
    total_liabilities = total_liabilities_val,
    net_worth = total_assets_val - total_liabilities_val,
    updated_at = NOW()
WHERE user_id = NEW.user_id;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update financial overview when accounts change
CREATE TRIGGER update_financial_overview_on_insert
    AFTER INSERT ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_financial_overview();

CREATE TRIGGER update_financial_overview_on_update
    AFTER UPDATE OF balance ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_financial_overview();

CREATE TRIGGER update_financial_overview_on_delete
    AFTER DELETE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_financial_overview();