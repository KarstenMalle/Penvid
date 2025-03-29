-- Create a user_settings table to store 2FA information
CREATE TABLE IF NOT EXISTS public.user_settings (
                                                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,  -- This would store the TOTP secret
    backup_codes JSONB,      -- Store backup codes for account recovery
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
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
INSERT INTO public.user_settings (user_id, two_factor_enabled)
VALUES (new.id, false);
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