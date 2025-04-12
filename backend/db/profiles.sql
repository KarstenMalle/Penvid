-- Add language, currency, and country preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language_preference text,
ADD COLUMN IF NOT EXISTS currency_preference text,
ADD COLUMN IF NOT EXISTS country_preference text;

-- Update the create_default_profile function to include preferences
CREATE OR REPLACE FUNCTION public.create_default_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        name,
        language_preference,
        currency_preference,
        country_preference
    )
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name' OR new.email,
        'en',
        'USD',
        'US'
    );
    RETURN new;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error creating default profile: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 