-- Create locales table with required fields
CREATE TABLE IF NOT EXISTS locales (
                                       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50) NOT NULL,
    flag VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

-- Insert default locales
INSERT INTO locales (code, name, native_name, flag, is_active) VALUES
                                                                   ('en', 'English', 'English', '🇺🇸', true),
                                                                   ('da', 'Danish', 'Dansk', '🇩🇰', true)
    ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
                              native_name = EXCLUDED.native_name,
                              flag = EXCLUDED.flag,
                              is_active = EXCLUDED.is_active,
                              updated_at = NOW();

-- Create translations table if not exists
CREATE TABLE IF NOT EXISTS translations (
                                            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    locale VARCHAR(2) NOT NULL REFERENCES locales(code),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(locale, key)
    );

-- Create user_preferences table if not exists
CREATE TABLE IF NOT EXISTS user_preferences (
                                                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    locale VARCHAR(2) DEFAULT 'en' REFERENCES locales(code),
    currency VARCHAR(3) DEFAULT 'DKK',
    country VARCHAR(2) DEFAULT 'DK',
    theme VARCHAR(20) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

-- Create currency_rates table if not exists
CREATE TABLE IF NOT EXISTS currency_rates (
                                              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(base_currency, target_currency)
    );