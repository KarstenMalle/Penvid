-- Create user_settings table for storing financial calculation preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
                                                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    expected_inflation numeric DEFAULT 0.025,
    expected_investment_return numeric DEFAULT 0.07,
    risk_tolerance numeric DEFAULT 0.2,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
    );

-- Set up Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a trigger to automatically create user settings when a new user signs up
CREATE OR REPLACE FUNCTION public.create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.user_settings (user_id)
VALUES (new.id);
RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error and continue without failing
    RAISE LOG 'Error creating user settings: %', SQLERRM;
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for handling new user signups
DROP TRIGGER IF EXISTS create_user_settings_trigger ON auth.users;
CREATE TRIGGER create_user_settings_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_settings();