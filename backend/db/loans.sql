-- Add loan_type column to loans table
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS loan_type TEXT DEFAULT 'OTHER';

-- Update existing loans to have a default loan type
UPDATE public.loans
SET loan_type = 'OTHER'
WHERE loan_type IS NULL; 