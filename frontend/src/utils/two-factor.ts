import { supabase } from '@/lib/supabase'

// This utility file contains functions to handle two-factor authentication
// with Supabase Auth and custom implementation

// Check if 2FA is enabled for a user
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('two_factor_enabled')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error checking 2FA status:', error)
      return false
    }

    return data?.two_factor_enabled || false
  } catch (error) {
    console.error('Error in isTwoFactorEnabled:', error)
    return false
  }
}

// Initialize 2FA setup
export async function initializeTwoFactor(userId: string) {
  try {
    // First create the user_settings record if it doesn't exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found
      throw checkError
    }

    if (!existingSettings) {
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert([
          {
            user_id: userId,
            two_factor_enabled: false,
            two_factor_secret: null,
            created_at: new Date().toISOString(),
          },
        ])

      if (insertError) {
        throw insertError
      }
    }

    // In a real implementation, you would:
    // 1. Generate a secret key for the user
    // 2. Generate a QR code for the user to scan with their authenticator app
    // 3. Return the secret and QR code

    // This would be implemented using a library like `otplib` for TOTP generation
    // For now, we'll just return placeholder data

    return {
      success: true,
      message:
        '2FA initialization started. This is a placeholder for actual 2FA implementation.',
      // In a real app, you would return:
      // secret: generatedSecret,
      // qrCode: generatedQrCodeUrl
    }
  } catch (error) {
    console.error('Error initializing 2FA:', error)
    return {
      success: false,
      message: 'Failed to initialize 2FA',
    }
  }
}

// Verify a 2FA token
export async function verifyTwoFactorToken(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    // In a real implementation, you would:
    // 1. Retrieve the user's secret from the database
    // 2. Verify the token against the secret

    // This would be implemented using a library like `otplib` for TOTP verification
    // For now, we'll just return a placeholder result

    // Pretend the token is valid if it's 6 digits
    const isValid = /^\d{6}$/.test(token)

    return isValid
  } catch (error) {
    console.error('Error verifying 2FA token:', error)
    return false
  }
}

// Enable 2FA for a user after successful verification
export async function enableTwoFactor(
  userId: string,
  secret: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error enabling 2FA:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in enableTwoFactor:', error)
    return false
  }
}

// Disable 2FA for a user
export async function disableTwoFactor(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error disabling 2FA:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in disableTwoFactor:', error)
    return false
  }
}
