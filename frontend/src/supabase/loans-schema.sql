-- Create a table to store user loans
CREATE TABLE IF NOT EXISTS public.loans (
                                            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id INTEGER NOT NULL, -- ID used in the frontend application
    name TEXT NOT NULL,
    balance DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(6, 3) NOT NULL,
    term_years INTEGER NOT NULL,
    minimum_payment DECIMAL(12, 2) NOT NULL,
    loan_type TEXT DEFAULT 'OTHER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, loan_id)
    );

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS loans_user_id_idx ON public.loans(user_id);

-- Set up Row Level Security
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view their own loans
CREATE POLICY "Users can view their own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own loans
CREATE POLICY "Users can insert their own loans" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own loans
CREATE POLICY "Users can update their own loans" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own loans
CREATE POLICY "Users can delete their own loans" ON public.loans
  FOR DELETE USING (auth.uid() = user_id);

-- Add function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();