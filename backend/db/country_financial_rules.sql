-- Create a table to store country-specific financial rules
CREATE TABLE IF NOT EXISTS public.country_financial_rules (
                                                              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code text NOT NULL UNIQUE,
    country_name text NOT NULL,
    display_name text NOT NULL,
    flag_emoji text,
    currency_code text NOT NULL,
    mortgage_interest_deductible boolean DEFAULT false,
    mortgage_interest_deduction_rate numeric,
    mortgage_interest_deduction_cap numeric,
    student_loan_interest_deductible boolean DEFAULT false,
    student_loan_interest_deduction_rate numeric,
    student_loan_interest_deduction_cap numeric,
    personal_loan_interest_deductible boolean DEFAULT false,
    auto_loan_interest_deductible boolean DEFAULT false,
    additional_regulations jsonb,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
    );

-- Insert default country rules
INSERT INTO public.country_financial_rules
(country_code, country_name, display_name, flag_emoji, currency_code,
 mortgage_interest_deductible, mortgage_interest_deduction_cap,
 student_loan_interest_deductible, student_loan_interest_deduction_cap)
VALUES
    ('US', 'United States', 'United States', '🇺🇸', 'USD',
     true, 750000, true, 2500)
    ON CONFLICT (country_code) DO NOTHING;

INSERT INTO public.country_financial_rules
(country_code, country_name, display_name, flag_emoji, currency_code,
 mortgage_interest_deductible, mortgage_interest_deduction_rate,
 student_loan_interest_deductible, personal_loan_interest_deductible, auto_loan_interest_deductible)
VALUES
    ('DK', 'Denmark', 'Danmark', '🇩🇰', 'DKK',
     true, 0.33, true, true, true)
    ON CONFLICT (country_code) DO NOTHING;